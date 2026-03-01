/**
 * AttachStream - bidirectional gRPC streaming for terminal attach (SSH-like)
 *
 * Uses connectTerminal RPC: sends AgentMessages, receives ControlMessages.
 * The first message must be a RegisterRequest with version ending in "-attach"
 * to signal attach mode (vs normal agent registration).
 *
 * Message flow:
 *   Client → Server: RegisterRequest, TerminalOutput (stdin), StatusUpdate (resize/signal), HeartbeatUpdate
 *   Server → Client: StartSessionCommand, TerminalInput (stdout), CloseSessionCommand, PingCommand
 */

import * as os from 'node:os';
import { CMDOPError } from '@cmdop/core';
import type { AgentMessage } from '../proto/generated/agent_messages';
import type { TerminalStreamingServiceClient } from '../proto/generated/service';
import { mapGrpcError } from '../errors';
import {
  StreamState,
  type AttachStreamEvent,
  type AttachStreamCallback,
  type StreamMetrics,
} from './base';

const KEEPALIVE_INTERVAL = 25_000;

export interface AttachStreamOptions {
  /** Initial terminal columns (default: 80) */
  cols?: number;
  /** Initial terminal rows (default: 24) */
  rows?: number;
  /** Enable debug logging to stderr (default: false) */
  debug?: boolean;
}

// ============================================================================
// MessageQueue — async generator feeding AgentMessages to connectTerminal
// ============================================================================

class MessageQueue {
  private _sessionId: string;
  private _counter = 0;
  private _messages: AgentMessage[] = [];
  private _resolve: (() => void) | null = null;
  private _waiting: Promise<void> | null = null;
  private _debug: boolean;
  done = false;

  constructor(sessionId: string, debug = false) {
    this._sessionId = sessionId;
    this._debug = debug;
  }

  private _nextId(): string {
    return `${this._sessionId}-${++this._counter}`;
  }

  enqueue(payload: AgentMessage['payload']): void {
    this._messages.push({
      sessionId: this._sessionId,
      messageId: this._nextId(),
      timestamp: new Date(),
      payload,
    });
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
      this._waiting = null;
    }
  }

  sendInput(data: Buffer | Uint8Array): void {
    this.enqueue({
      $case: 'output' as const,
      output: { data: Buffer.from(data), isStderr: false, sequence: '0' },
    });
  }

  sendResize(cols: number, rows: number): void {
    this.enqueue({
      $case: 'status' as const,
      status: { oldStatus: 0, newStatus: 0, reason: `resize:${cols}x${rows}`, workingDirectory: '' },
    });
  }

  sendSignal(signalNum: number): void {
    this.enqueue({
      $case: 'status' as const,
      status: { oldStatus: 0, newStatus: 0, reason: `signal:${signalNum}`, workingDirectory: '' },
    });
  }

  sendHeartbeat(): void {
    this.enqueue({
      $case: 'heartbeat' as const,
      heartbeat: { metrics: undefined },
    });
  }

  async *generate(): AsyncGenerator<AgentMessage> {
    while (!this.done) {
      if (this._messages.length === 0) {
        this._waiting = new Promise<void>((r) => { this._resolve = r; });

        const timeout = new Promise<'keepalive'>((r) =>
          setTimeout(() => r('keepalive'), KEEPALIVE_INTERVAL),
        );

        const result = await Promise.race([this._waiting, timeout]);

        if (this.done) return;

        if (result === 'keepalive' && this._messages.length === 0) {
          this.sendHeartbeat();
          if (this._debug) process.stderr.write('[attach] keepalive sent\n');
        }
      }

      while (this._messages.length > 0) {
        const msg = this._messages.shift()!;
        if (this._debug) process.stderr.write(`[attach] yield ${msg.payload?.$case}\n`);
        yield msg;
      }
    }
  }

  shutdown(): void {
    this.done = true;
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }
}

// ============================================================================
// AttachStream
// ============================================================================

export class AttachStream {
  private _state: StreamState = StreamState.IDLE;
  private _listeners: AttachStreamCallback[] = [];
  private _queue: MessageQueue | null = null;
  private _metrics: StreamMetrics = {
    bytesSent: 0,
    bytesReceived: 0,
    pollCount: 0,
    lastActivityAt: Date.now(),
    errors: 0,
  };

  private readonly _client: TerminalStreamingServiceClient;
  private readonly _sessionId: string;
  private readonly _opts: Required<AttachStreamOptions>;

  constructor(
    client: TerminalStreamingServiceClient,
    sessionId: string,
    options: AttachStreamOptions = {},
  ) {
    this._client = client;
    this._sessionId = sessionId;
    this._opts = {
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
      debug: options.debug ?? false,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Public API — event listeners
  // ──────────────────────────────────────────────────────────────────

  on(callback: AttachStreamCallback): this {
    this._listeners.push(callback);
    return this;
  }

  off(callback: AttachStreamCallback): this {
    this._listeners = this._listeners.filter((l) => l !== callback);
    return this;
  }

  // ──────────────────────────────────────────────────────────────────
  // Public API — state / metrics
  // ──────────────────────────────────────────────────────────────────

  get state(): StreamState {
    return this._state;
  }

  get metrics(): Readonly<StreamMetrics> {
    return { ...this._metrics };
  }

  // ──────────────────────────────────────────────────────────────────
  // Public API — lifecycle
  // ──────────────────────────────────────────────────────────────────

  /**
   * Connect to the terminal session via bidirectional gRPC stream.
   *
   * Sends a RegisterRequest with version ending in "-attach" to signal
   * attach mode, then processes ControlMessage responses.
   *
   * Resolves when the stream closes (server disconnect, error, or close() call).
   */
  async connect(): Promise<void> {
    if (this._state !== StreamState.IDLE) {
      throw new CMDOPError('AttachStream already started');
    }

    this._state = StreamState.CONNECTING;
    this._queue = new MessageQueue(this._sessionId, this._opts.debug);

    // "-attach" suffix tells Django to add this as SDK subscriber
    // instead of registering a new agent session (see sdk_bridge.py)
    this._queue.enqueue({
      $case: 'register' as const,
      register: {
        version: 'sdk-node-0.1.0-attach',
        hostname: os.hostname(),
        platform: process.platform.toLowerCase(),
        supportedShells: [],
        initialSize: { cols: this._opts.cols, rows: this._opts.rows, width: 0, height: 0 },
        architecture: '',
        deviceId: '',
        deviceType: '',
        hasShell: true,
        deviceModel: '',
        publicIp: '',
        localIps: [],
        username: os.userInfo().username,
        uid: 0,
        isRoot: false,
        homeDir: os.homedir(),
        osVersion: '',
        kernelVersion: '',
        cpuModel: '',
        cpuCount: 0,
        totalRam: '0',
        uptimeSeconds: '0',
      },
    });

    this._state = StreamState.REGISTERING;

    if (this._opts.debug) {
      process.stderr.write(`[attach] sessionId=${this._sessionId}\n`);
      process.stderr.write(`[attach] starting connectTerminal stream\n`);
    }
    const responseStream = this._client.connectTerminal(this._queue.generate());

    this._state = StreamState.CONNECTED;

    try {
      for await (const msg of responseStream) {
        const s = this._getState();
        if (s === StreamState.CLOSING || s === StreamState.CLOSED) break;
        if (!msg.payload) continue;

        if (this._opts.debug) process.stderr.write(`[attach] recv ${msg.payload.$case}\n`);

        switch (msg.payload.$case) {
          case 'startSession':
            this._emit({ type: 'sessionReady' });
            break;

          case 'input':
            this._metrics.bytesReceived += msg.payload.input.data.length;
            this._metrics.lastActivityAt = Date.now();
            this._emit({
              type: 'output',
              data: Buffer.isBuffer(msg.payload.input.data)
                ? msg.payload.input.data
                : Buffer.from(msg.payload.input.data),
            });
            break;

          case 'closeSession':
            this._emit({ type: 'closed', reason: msg.payload.closeSession.reason });
            break;

          case 'ping':
            this._queue?.sendHeartbeat();
            break;
        }
      }
    } catch (err) {
      const s = this._getState();
      if (s !== StreamState.CLOSING && s !== StreamState.CLOSED) {
        this._metrics.errors++;
        const mapped = mapGrpcError(err);
        this._emit({ type: 'error', error: mapped });
      }
    }

    if (this._getState() !== StreamState.CLOSED) {
      this._state = StreamState.CLOSED;
      this._queue?.shutdown();
    }
  }

  /**
   * Send terminal input (stdin data) to the remote session.
   */
  sendInput(data: Buffer | Uint8Array | string): void {
    this._assertConnected();
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    this._queue!.sendInput(buffer);
    this._metrics.bytesSent += buffer.length;
    this._metrics.lastActivityAt = Date.now();
  }

  /**
   * Send terminal resize event.
   */
  sendResize(cols: number, rows: number): void {
    this._assertConnected();
    this._queue!.sendResize(cols, rows);
  }

  /**
   * Send a signal to the remote process.
   */
  sendSignal(signal: number): void {
    this._assertConnected();
    this._queue!.sendSignal(signal);
  }

  /**
   * Close the stream gracefully.
   */
  close(): void {
    const s = this._getState();
    if (s === StreamState.CLOSED || s === StreamState.CLOSING) return;
    this._state = StreamState.CLOSING;
    this._queue?.shutdown();
    this._state = StreamState.CLOSED;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.close();
  }

  // ──────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────

  private _getState(): StreamState {
    return this._state;
  }

  private _assertConnected(): void {
    const s = this._getState();
    if (s !== StreamState.CONNECTED && s !== StreamState.REGISTERING) {
      throw new CMDOPError(`AttachStream is not connected (state: ${s})`);
    }
  }

  private _emit(event: AttachStreamEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }
}
