/**
 * Base service class with shared session ID, machine routing, and error-wrapping logic
 */

import { SessionError } from '@cmdop/core';
import { mapGrpcError } from '../errors';
import type { TerminalStreamingServiceClient } from '../proto/generated/service';
import type { SetMachineResult } from '../models/terminal';

export abstract class BaseService {
  protected _sessionId: string = '';
  private _hostname: string = '';
  private _sessionInfo: SetMachineResult | null = null;

  constructor(protected readonly client: TerminalStreamingServiceClient) {}

  // ============================================================================
  // Session routing
  // ============================================================================

  /**
   * Set session ID for remote operations.
   * For local IPC this is a no-op (server ignores it).
   */
  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;
  }

  getSessionId(): string {
    return this._sessionId;
  }

  /**
   * Set target machine by hostname for all subsequent service calls.
   *
   * Resolves the hostname to a session via GetSessionByHostname gRPC.
   * Caches both sessionId and session info for future calls.
   *
   * @param hostname Machine hostname (exact or partial match)
   * @param partialMatch Use ICONTAINS match (default: true)
   *
   * @throws {SessionError} if no session found or hostname is ambiguous
   *
   * @example
   * ```typescript
   * await client.files.setMachine('my-server');
   * const files = await client.files.list('/tmp');  // no sessionId needed
   *
   * await client.agent.setMachine('my-server');
   * const result = await client.agent.run('hello');
   * ```
   */
  async setMachine(hostname: string, partialMatch: boolean = true): Promise<SetMachineResult> {
    const result = await this.getSessionByHostname(hostname, partialMatch);

    this._sessionId = result.sessionId;
    this._hostname = result.hostname;
    this._sessionInfo = result;

    return result;
  }

  /**
   * Look up the best active session for a given machine hostname.
   * Does NOT cache — use `setMachine()` to also cache.
   *
   * @throws {SessionError} if no session found or ambiguous
   */
  async getSessionByHostname(
    hostname: string,
    partialMatch: boolean = true
  ): Promise<SetMachineResult> {
    const response = await this.call(() =>
      this.client.getSessionByHostname({ hostname, partialMatch })
    );

    if (response.ambiguous) {
      throw new SessionError(
        `Ambiguous hostname "${hostname}": ${response.matchesCount} machines matched. ` +
        `Use a more specific name or set partialMatch=false.`
      );
    }

    if (!response.found) {
      throw new SessionError(
        response.error || `No active session found for hostname "${hostname}"`
      );
    }

    return {
      sessionId: response.sessionId,
      hostname: response.machineHostname,
      machineName: response.machineName,
      status: response.status,
      os: response.os || undefined,
      agentVersion: response.agentVersion || undefined,
      hasShell: response.hasShell || undefined,
      shell: response.shell || undefined,
      workingDir: response.workingDirectory || undefined,
      connectedAt: response.connectedAt ?? undefined,
      heartbeatAgeSeconds: response.heartbeatAgeSeconds || undefined,
    };
  }

  /**
   * Clear cached session and hostname (from setMachine or setSessionId).
   */
  clearSession(): void {
    this._sessionId = '';
    this._hostname = '';
    this._sessionInfo = null;
  }

  /**
   * Get the currently cached session info (set by setMachine).
   * Returns null if no machine has been set.
   */
  get currentSession(): SetMachineResult | null {
    return this._sessionInfo;
  }

  /**
   * Get the currently cached hostname (set by setMachine).
   * Returns empty string if no machine has been set.
   */
  get currentHostname(): string {
    return this._hostname;
  }

  // ============================================================================
  // Error wrapping
  // ============================================================================

  /**
   * Wrap an async gRPC call, mapping gRPC status errors to CMDOPError.
   */
  protected async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw mapGrpcError(err);
    }
  }
}
