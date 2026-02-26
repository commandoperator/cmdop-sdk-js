/**
 * TerminalStream — bidirectional terminal I/O with output polling
 *
 * Architecture:
 *   Input:  sendInput / sendResize / sendSignal via unary RPCs
 *   Output: polling getOutput at a configurable interval
 *
 * State machine:
 *   IDLE → CONNECTING → REGISTERING → CONNECTED → CLOSING → CLOSED
 *                                                  ↓
 *                                                ERROR
 */

import { CMDOPError } from '@cmdop/core';
import { mapGrpcError } from '../errors';
import type { TerminalStreamingServiceClient } from '../proto/generated/service';
import {
  StreamState,
  type TerminalStreamCallback,
  type TerminalStreamEvent,
  type StreamMetrics,
} from './base';

const SIGNAL_MAP: Record<string, number> = {
  SIGINT: 2,
  SIGTERM: 15,
  SIGKILL: 9,
  SIGSTOP: 19,
  SIGCONT: 18,
  SIGHUP: 1,
};

export interface TerminalStreamOptions {
  /** Poll interval in ms (default: 100) */
  pollIntervalMs?: number;
  /** Max consecutive empty polls before slowing down (default: 10) */
  idleThreshold?: number;
  /** Slow poll interval when idle (default: 500) */
  idlePollIntervalMs?: number;
  /** Max bytes per poll (default: 0 = server default 1MB) */
  maxBytesPerPoll?: number;
}

export class TerminalStream {
  private _state: StreamState = StreamState.IDLE;
  private _listeners: TerminalStreamCallback[] = [];
  private _metrics: StreamMetrics = {
    bytesSent: 0,
    bytesReceived: 0,
    pollCount: 0,
    lastActivityAt: Date.now(),
    errors: 0,
  };

  private _pollTimer: ReturnType<typeof setTimeout> | null = null;
  private _outputOffset: number = 0;
  private _consecutiveEmpty: number = 0;
  private _closed: boolean = false;
  private _closeResolve: (() => void) | null = null;
  private _closePromise: Promise<void> | null = null;

  private readonly _client: TerminalStreamingServiceClient;
  private readonly _sessionId: string;
  private readonly _opts: Required<TerminalStreamOptions>;

  constructor(
    client: TerminalStreamingServiceClient,
    sessionId: string,
    options: TerminalStreamOptions = {}
  ) {
    this._client = client;
    this._sessionId = sessionId;
    this._opts = {
      pollIntervalMs: options.pollIntervalMs ?? 100,
      idleThreshold: options.idleThreshold ?? 10,
      idlePollIntervalMs: options.idlePollIntervalMs ?? 500,
      maxBytesPerPoll: options.maxBytesPerPoll ?? 0,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Public API — event listeners
  // ──────────────────────────────────────────────────────────────────

  on(callback: TerminalStreamCallback): this {
    this._listeners.push(callback);
    return this;
  }

  off(callback: TerminalStreamCallback): this {
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
   * Start polling for output. Returns a Promise that resolves when the
   * stream is closed (via close() or error).
   */
  connect(): Promise<void> {
    if (this._getState() !== StreamState.IDLE) {
      throw new CMDOPError('TerminalStream already started');
    }

    this._state = StreamState.CONNECTING;
    this._emit({ type: 'status', status: 'connecting' });

    this._state = StreamState.REGISTERING;
    this._emit({ type: 'status', status: 'registering' });

    this._state = StreamState.CONNECTED;
    this._emit({ type: 'status', status: 'connected' });

    this._closePromise = new Promise<void>((resolve) => {
      this._closeResolve = resolve;
    });

    this._schedulePoll();
    return this._closePromise;
  }

  /**
   * Close the stream gracefully.
   */
  async close(): Promise<void> {
    const s = this._getState();
    if (s === StreamState.CLOSED || s === StreamState.CLOSING) {
      return;
    }
    this._state = StreamState.CLOSING;
    this._emit({ type: 'status', status: 'closing' });

    if (this._pollTimer !== null) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }

    this._closed = true;
    this._state = StreamState.CLOSED;
    this._emit({ type: 'status', status: 'closed' });
    this._closeResolve?.();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  // ──────────────────────────────────────────────────────────────────
  // Public API — input
  // ──────────────────────────────────────────────────────────────────

  async sendInput(data: string | Buffer): Promise<void> {
    this._assertConnected();
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    try {
      const response = await this._client.sendInput({
        sessionId: this._sessionId,
        data: buffer,
      });
      if (!response.success) {
        throw new CMDOPError(response.error || 'Failed to send input');
      }
      this._metrics.bytesSent += buffer.length;
      this._metrics.lastActivityAt = Date.now();
    } catch (err) {
      throw mapGrpcError(err);
    }
  }

  async sendResize(cols: number, rows: number): Promise<void> {
    this._assertConnected();
    try {
      const response = await this._client.sendResize({
        sessionId: this._sessionId,
        cols,
        rows,
      });
      if (!response.success) {
        throw new CMDOPError(response.error || 'Failed to resize terminal');
      }
    } catch (err) {
      throw mapGrpcError(err);
    }
  }

  async sendSignal(signal: 'SIGINT' | 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT' | 'SIGHUP' | number): Promise<void> {
    this._assertConnected();
    const signalNum = typeof signal === 'number' ? signal : SIGNAL_MAP[signal] ?? 15;
    try {
      const response = await this._client.sendSignal({
        sessionId: this._sessionId,
        signal: signalNum,
      });
      if (!response.success) {
        throw new CMDOPError(response.error || 'Failed to send signal');
      }
    } catch (err) {
      throw mapGrpcError(err);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────

  private _getState(): StreamState {
    return this._state;
  }

  private _assertConnected(): void {
    const s = this._getState();
    if (s !== StreamState.CONNECTED) {
      throw new CMDOPError(`TerminalStream is not connected (state: ${s})`);
    }
  }

  private _emit(event: TerminalStreamEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }

  private _schedulePoll(): void {
    if (this._closed) return;

    const isIdle = this._consecutiveEmpty >= this._opts.idleThreshold;
    const delay = isIdle ? this._opts.idlePollIntervalMs : this._opts.pollIntervalMs;

    this._pollTimer = setTimeout(() => {
      void this._poll();
    }, delay);
  }

  private async _poll(): Promise<void> {
    if (this._closed) return;
    if (this._getState() !== StreamState.CONNECTED) return;

    this._metrics.pollCount++;

    try {
      const response = await this._client.getOutput({
        sessionId: this._sessionId,
        offset: this._outputOffset,
        limit: this._opts.maxBytesPerPoll,
      });

      const data = response.data;

      if (data && data.length > 0) {
        this._outputOffset += data.length;
        this._metrics.bytesReceived += data.length;
        this._metrics.lastActivityAt = Date.now();
        this._consecutiveEmpty = 0;

        this._emit({
          type: 'output',
          data: Buffer.isBuffer(data) ? data : Buffer.from(data),
          totalBytes: response.totalBytes,
        });
      } else {
        this._consecutiveEmpty++;
      }

      this._schedulePoll();
    } catch (err) {
      if (this._closed) return;

      this._metrics.errors++;
      const mapped = mapGrpcError(err);
      this._emit({ type: 'error', error: mapped });

      // schedule next poll anyway — transient errors shouldn't kill the stream
      this._schedulePoll();
    }
  }
}
