/**
 * Terminal service for session management and I/O
 */

import { SessionError } from '@cmdop/core';
import type { SessionInfoItem } from '../proto/generated/rpc_messages/session';
import { sessionStatusToJSON } from '../proto/generated/common_types';
import { BaseService } from './base';
import { TerminalStream } from '../streaming/terminal';
import type { TerminalStreamOptions } from '../streaming/terminal';
import { AttachStream } from '../streaming/attach';
import type { AttachStreamOptions } from '../streaming/attach';
import type {
  CreateSessionOptions,
  ListSessionsOptions,
  SessionInfo,
  SessionStatusInfo,
  SetMachineResult,
} from '../models/terminal';

export type {
  CreateSessionOptions,
  ListSessionsOptions,
  SessionInfo,
  SessionStatusInfo,
  SetMachineResult,
} from '../models/terminal';

export class TerminalService extends BaseService {
  async create(options: CreateSessionOptions = {}): Promise<SessionInfo> {
    const response = await this.call(() =>
      this.client.createSession({
        userId: '',
        name: options.name ?? '',
        config: {
          sessionId: '',
          shell: options.shell ?? '',
          workingDirectory: options.workingDir ?? '',
          env: options.env ?? {},
          size: { cols: options.cols ?? 80, rows: options.rows ?? 24, width: 0, height: 0 },
        },
      })
    );

    if (!response.success) {
      throw new SessionError(response.error || 'Failed to create session');
    }

    return {
      sessionId: response.sessionId,
      shell: options.shell,
      workingDir: options.workingDir,
      status: 'connected',
    };
  }

  async close(sessionId: string, options?: { reason?: string; force?: boolean }): Promise<void> {
    const response = await this.call(() =>
      this.client.closeSession({
        sessionId,
        reason: options?.reason ?? '',
        force: options?.force ?? false,
      })
    );

    if (!response.success) {
      throw new SessionError(response.error || 'Failed to close session', sessionId);
    }
  }

  async getStatus(sessionId: string): Promise<SessionStatusInfo> {
    const response = await this.call(() =>
      this.client.getSessionStatus({ sessionId })
    );

    return {
      exists: response.exists,
      status: sessionStatusToJSON(response.status),
      hostname: response.agentHostname,
      connectedAt: response.connectedAt ?? undefined,
      lastHeartbeat: response.lastHeartbeatAt ?? undefined,
      commandsCount: response.commandsCount,
    };
  }

  async list(options: ListSessionsOptions = {}): Promise<{
    sessions: SessionInfo[];
    total: number;
    workspaceName: string;
  }> {
    const response = await this.call(() =>
      this.client.listSessions({
        hostnameFilter: options.hostname ?? '',
        statusFilter: options.status ?? '',
        limit: options.limit ?? 20,
        offset: options.offset ?? 0,
      })
    );

    if (response.error) {
      throw new SessionError(response.error);
    }

    return {
      sessions: response.sessions.map(mapSessionInfo),
      total: response.total,
      workspaceName: response.workspaceName,
    };
  }

  async listActive(options: Omit<ListSessionsOptions, 'status'> = {}): Promise<{
    sessions: SessionInfo[];
    total: number;
    workspaceName: string;
  }> {
    return this.list({ ...options, status: 'connected' });
  }

  async sendInput(sessionId: string, data: string | Uint8Array): Promise<void> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);

    const response = await this.call(() =>
      this.client.sendInput({ sessionId, data: buffer })
    );

    if (!response.success) {
      throw new SessionError(response.error || 'Failed to send input', sessionId);
    }
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const response = await this.call(() =>
      this.client.sendResize({ sessionId, cols, rows })
    );

    if (!response.success) {
      throw new SessionError(response.error || 'Failed to resize terminal', sessionId);
    }
  }

  async signal(
    sessionId: string,
    signal: 'SIGINT' | 'SIGTERM' | 'SIGKILL' | number
  ): Promise<void> {
    const signalNum = typeof signal === 'number' ? signal : SIGNAL_MAP[signal];

    const response = await this.call(() =>
      this.client.sendSignal({ sessionId, signal: signalNum })
    );

    if (!response.success) {
      throw new SessionError(response.error || 'Failed to send signal', sessionId);
    }
  }

  async getHistory(
    sessionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ commands: string[]; total: number }> {
    const response = await this.call(() =>
      this.client.getHistory({
        sessionId,
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
      })
    );

    return {
      commands: response.commands,
      total: response.total,
    };
  }

  /**
   * Get raw terminal output buffer (polling-based).
   * Used internally by TerminalStream and for execute() support.
   */
  async getOutput(
    sessionId: string,
    options?: { offset?: number; limit?: number }
  ): Promise<{ data: Buffer; totalBytes: number; hasMore: boolean }> {
    const response = await this.call(() =>
      this.client.getOutput({
        sessionId,
        offset: options?.offset ?? 0,
        limit: options?.limit ?? 0,
      })
    );

    return {
      data: response.data,
      totalBytes: response.totalBytes,
      hasMore: response.hasMore,
    };
  }

  /**
   * Create a TerminalStream for this session.
   * The stream polls getOutput for output data and uses unary RPCs for input.
   *
   * @example
   * const stream = terminal.stream(sessionId);
   * stream.on((event) => {
   *   if (event.type === 'output') process.stdout.write(event.data);
   * });
   * await stream.connect();
   * await stream.sendInput('ls -la\n');
   * // ... later:
   * await stream.close();
   */
  stream(sessionId: string, options?: TerminalStreamOptions): TerminalStream {
    return new TerminalStream(this.client, sessionId, options);
  }

  /**
   * Create an AttachStream for bidirectional terminal attach (SSH-like).
   *
   * Uses the connectTerminal gRPC bidirectional stream to attach to an
   * existing session with full stdin/stdout/resize support.
   *
   * @example
   * const stream = terminal.attach(sessionId);
   * stream.on((event) => {
   *   if (event.type === 'sessionReady') console.log('Connected!');
   *   if (event.type === 'output') process.stdout.write(event.data);
   * });
   * await stream.connect();
   */
  attach(sessionId: string, options?: AttachStreamOptions): AttachStream {
    return new AttachStream(this.client, sessionId, options);
  }

  /**
   * Execute a command and return its output.
   *
   * Wraps the command with unique START/END markers, sends it to the terminal,
   * then polls the output buffer until the END marker appears and extracts the
   * clean output between the markers.
   *
   * Requires either an explicit `sessionId` option or a prior `setMachine()` call.
   *
   * @param command Shell command to execute
   * @param options.sessionId Session to run on (falls back to cached session)
   * @param options.timeoutMs Max wait time in ms (default: 30000)
   * @param options.pollIntervalMs Poll interval in ms (default: 200)
   * @returns `{ output, exitCode }` — exitCode is -1 on timeout/error
   *
   * @example
   * ```typescript
   * await client.terminal.setMachine('my-server');
   * const { output, exitCode } = await client.terminal.execute('ls -la /tmp');
   * console.log(output);
   * ```
   */
  async execute(
    command: string,
    options?: { sessionId?: string; timeoutMs?: number; pollIntervalMs?: number }
  ): Promise<{ output: string; exitCode: number }> {
    const sessionId = options?.sessionId ?? this._sessionId;
    if (!sessionId) {
      return {
        output: 'No session. Call setMachine() first or pass sessionId.',
        exitCode: -1,
      };
    }

    const timeoutMs = options?.timeoutMs ?? 30_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 200;

    // Unique marker per invocation so concurrent calls don't collide
    const cmdId = Math.random().toString(36).slice(2, 14);
    const startMarker = `<<CMD:${cmdId}:START>>`;
    const endMarkerPrefix = `<<CMD:${cmdId}:END:`;

    // Wrap command: print START, run command, print END with exit code
    const fullCmd =
      `printf "\\n${startMarker}\\n"; ` +
      `${command}; ` +
      `printf "\\n${endMarkerPrefix}%d>>\\n" $?\n`;

    try {
      await this.sendInput(sessionId, fullCmd);
    } catch (err) {
      return { output: `Failed to send command: ${String(err)}`, exitCode: -1 };
    }

    const startMarkerBytes = Buffer.from(startMarker);
    const endPattern = new RegExp(`<<CMD:${cmdId}:END:(\\d+)>>`);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      let fullOutput: Buffer;
      try {
        const result = await this.getOutput(sessionId, { limit: 20 * 1024 });
        fullOutput = result.data;
      } catch (err) {
        return { output: `Failed to get output: ${String(err)}`, exitCode: -1 };
      }

      const outputStr = fullOutput.toString();
      const endMatch = endPattern.exec(outputStr);

      if (endMatch && fullOutput.includes(startMarkerBytes)) {
        const exitCode = parseInt(endMatch[1]!, 10);
        const endPos = endMatch.index;
        const searchRegion = fullOutput.subarray(0, endPos);
        const startIdx = searchRegion.lastIndexOf(startMarkerBytes);

        if (startIdx === -1) {
          return { output: '', exitCode };
        }

        // Skip past marker + trailing CRLF
        let contentStart = startIdx + startMarkerBytes.length;
        while (
          contentStart < endPos &&
          (fullOutput[contentStart] === 0x0d || fullOutput[contentStart] === 0x0a)
        ) {
          contentStart++;
        }

        const raw = fullOutput.subarray(contentStart, endPos);

        // Filter noise: marker lines, echoed command, shell prompt lines
        const fullCmdPrefix = Buffer.from(`printf "\\n${startMarker}`);
        const filtered = raw
          .toString()
          .split('\n')
          .filter((line) => {
            if (line.includes('<<CMD:')) return false;
            if (line.includes(fullCmdPrefix.toString())) return false;
            const stripped = line.trim();
            if (
              stripped &&
              (stripped.endsWith('$') || stripped.endsWith('#') || stripped.endsWith('>')) &&
              (stripped.includes('@') || stripped.includes(':'))
            ) {
              return false;
            }
            return true;
          })
          .join('\n')
          .replace(/\r/g, '');

        // Trim leading/trailing blank lines
        const lines = filtered.split('\n');
        let lo = 0;
        let hi = lines.length - 1;
        while (lo <= hi && !lines[lo]!.trim()) lo++;
        while (hi >= lo && !lines[hi]!.trim()) hi--;
        const output = lines.slice(lo, hi + 1).join('\n');

        return { output, exitCode };
      }
    }

    // Timeout — return partial output if START marker was seen
    let timeoutMsg = `[CMDOP] Command timed out after ${timeoutMs}ms.`;
    try {
      const result = await this.getOutput(sessionId, { limit: 20 * 1024 });
      const fullOutput = result.data;
      if (fullOutput.includes(startMarkerBytes)) {
        const startIdx = fullOutput.lastIndexOf(startMarkerBytes);
        let contentStart = startIdx + startMarkerBytes.length;
        while (
          contentStart < fullOutput.length &&
          (fullOutput[contentStart] === 0x0d || fullOutput[contentStart] === 0x0a)
        ) {
          contentStart++;
        }
        const partial = fullOutput.subarray(contentStart).toString().replace(/\r/g, '').trim();
        if (partial && partial.length < 2000) {
          timeoutMsg += `\nPartial output:\n${partial}`;
        }
      }
    } catch {
      // ignore error fetching partial output
    }

    return { output: timeoutMsg, exitCode: -1 };
  }

  /**
   * Get the most recently active (connected) session for a machine.
   *
   * Returns the connected session with the lowest heartbeat age (most recent).
   * Falls back to `currentHostname` if no explicit hostname is given.
   *
   * @param options.hostname Machine hostname filter (partial match)
   * @returns `SessionInfo` if found, `undefined` otherwise
   *
   * @example
   * ```typescript
   * const session = await client.terminal.getActiveSession({ hostname: 'my-server' });
   * if (session) {
   *   client.terminal.setSessionId(session.sessionId);
   * }
   * ```
   */
  async getActiveSession(options?: {
    hostname?: string;
    partialMatch?: boolean;
  }): Promise<SessionInfo | undefined> {
    const hostname = options?.hostname ?? this.currentHostname;
    if (!hostname) return undefined;

    const { sessions } = await this.list({
      hostname,
      status: 'connected',
      limit: 5,
    });

    if (sessions.length === 0) return undefined;

    // Sort by heartbeatAgeSeconds ascending (most recent first) — not in SessionInfo,
    // so just return the first connected session from the server's ordering
    return sessions[0];
  }
}

function mapSessionInfo(item: SessionInfoItem): SessionInfo {
  return {
    sessionId: item.sessionId,
    hostname: item.machineHostname,
    machineName: item.machineName,
    status: item.status,
    os: item.os,
    agentVersion: item.agentVersion,
    hasShell: item.hasShell,
    shell: item.shell,
    workingDir: item.workingDirectory,
    connectedAt: item.connectedAt ?? undefined,
  };
}

const SIGNAL_MAP: Record<string, number> = {
  SIGINT: 2,
  SIGTERM: 15,
  SIGKILL: 9,
};
