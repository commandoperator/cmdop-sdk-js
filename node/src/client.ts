/**
 * CMDOPClient - Main entry point for the Node.js SDK
 */

import { ConnectionError } from '@cmdop/core';

import type { Transport, LocalTransportOptions, RemoteTransportOptions } from './transport';
import { LocalTransport, RemoteTransport } from './transport';
import { TerminalService } from './services/terminal';
import { FilesService } from './services/files';
import { AgentService } from './services/agent';

/**
 * Client options for local connection
 */
export interface LocalClientOptions extends LocalTransportOptions {}

/**
 * Client options for remote connection
 */
export interface RemoteClientOptions extends Omit<RemoteTransportOptions, 'apiKey'> {}

/**
 * CMDOPClient for interacting with the cmdop agent
 *
 * @example Local connection (auto-discover agent)
 * ```typescript
 * const client = await CMDOPClient.local();
 * const session = await client.terminal.create();
 * ```
 *
 * @example Remote connection (via cloud relay)
 * ```typescript
 * const client = await CMDOPClient.remote('cmdop_live_xxx');
 * const sessions = await client.terminal.list();
 * ```
 */
export class CMDOPClient {
  private _transport: Transport;
  private _terminal: TerminalService | null = null;
  private _files: FilesService | null = null;
  private _agent: AgentService | null = null;
  private _sessionId: string = '';

  private constructor(transport: Transport) {
    this._transport = transport;
  }

  /**
   * Connect to a local agent via Unix socket / Named Pipe
   *
   * Uses automatic discovery:
   * 1. Checks CMDOP_AGENT_INFO env var
   * 2. Reads ~/.cmdop/agent.info
   * 3. Reads /var/run/cmdop/agent.info
   */
  static async local(options?: LocalClientOptions): Promise<CMDOPClient> {
    const transport = await LocalTransport.discover(options);
    return new CMDOPClient(transport);
  }

  /**
   * Connect to a remote agent via cloud relay (grpc.cmdop.com)
   */
  static async remote(apiKey: string, options?: RemoteClientOptions): Promise<CMDOPClient> {
    const transport = new RemoteTransport({ apiKey, ...options });
    await transport.connect();
    return new CMDOPClient(transport);
  }

  /**
   * Whether the client is connected
   */
  get isConnected(): boolean {
    return this._transport.isConnected;
  }

  /**
   * The address this client is connected to
   */
  get address(): string {
    return this._transport.address;
  }

  /**
   * Terminal service for session management and I/O
   */
  get terminal(): TerminalService {
    if (!this._terminal) {
      if (!this._transport.isConnected) {
        throw new ConnectionError('Client not connected');
      }
      this._terminal = new TerminalService(this._transport.createClient());
    }
    return this._terminal;
  }

  /**
   * Files service for file operations
   *
   * For local IPC, just call methods directly.
   * For remote, use setSessionId() first.
   */
  get files(): FilesService {
    if (!this._files) {
      if (!this._transport.isConnected) {
        throw new ConnectionError('Client not connected');
      }
      this._files = new FilesService(this._transport.createClient());
      // Apply session ID if one was set
      if (this._sessionId) {
        this._files.setSessionId(this._sessionId);
      }
    }
    return this._files;
  }

  /**
   * Agent service for AI agent execution
   *
   * For local IPC, just call methods directly.
   * For remote, use setSessionId() first.
   */
  get agent(): AgentService {
    if (!this._agent) {
      if (!this._transport.isConnected) {
        throw new ConnectionError('Client not connected');
      }
      this._agent = new AgentService(this._transport.createClient());
      // Apply session ID if one was set
      if (this._sessionId) {
        this._agent.setSessionId(this._sessionId);
      }
    }
    return this._agent;
  }

  /**
   * Set session ID for all services.
   * Required for remote connections, optional for local IPC.
   *
   * This sets:
   * - Agent ID for gRPC metadata routing (x-agent-id header)
   * - Session ID for files and agent request bodies
   *
   * @example
   * ```typescript
   * const { sessions } = await client.terminal.list();
   * client.setSessionId(sessions[0].sessionId);
   *
   * // Now all methods work without passing sessionId
   * const files = await client.files.list('/tmp');
   * const result = await client.agent.run('Hello');
   * await client.terminal.create(); // Routes to correct machine
   * ```
   */
  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;

    // Set agent ID on transport for gRPC metadata routing (x-agent-id header)
    // This is critical for terminal operations which don't pass sessionId in request body
    this._transport.setAgentId(sessionId);

    // Invalidate cached services so they get recreated with new transport client
    // The getters will apply _sessionId when recreating services
    this._terminal = null;
    this._files = null;
    this._agent = null;
  }

  /**
   * Perform a health check on the agent
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    version: string;
    activeSessions: number;
    connectedClients: number;
  }> {
    const client = this._transport.createClient();
    const response = await client.healthCheck({});
    return {
      healthy: response.healthy,
      version: response.version,
      activeSessions: response.activeSessions,
      connectedClients: response.connectedClients,
    };
  }

  /**
   * Close the connection and cleanup resources
   */
  async close(): Promise<void> {
    this._terminal = null;
    this._files = null;
    this._agent = null;
    await this._transport.close();
  }

  /**
   * Explicit resource management (TypeScript 5.2+)
   *
   * @example
   * ```typescript
   * await using client = await CMDOPClient.local();
   * // client is automatically closed when scope ends
   * ```
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
