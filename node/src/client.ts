/**
 * CMDOPClient - Main entry point for the Node.js SDK
 */

import { ConnectionError } from '@cmdop/core';

import type { Transport, LocalTransportOptions, RemoteTransportOptions } from './transport';
import { BaseTransport, LocalTransport, RemoteTransport } from './transport';
import { AgentDiscovery } from './discovery';
import type { RemoteAgentInfo } from './discovery';
import { TerminalService } from './services/terminal';
import { FilesService } from './services/files';
import { AgentService } from './services/agent';
import { ExtractService } from './services/extract';
import { BrowserService } from './services/browser';
import { DownloadService } from './services/download';

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
 * const client = CMDOPClient.local();
 * await client.terminal.create();
 * ```
 *
 * @example Remote connection (via cloud relay)
 * ```typescript
 * const client = CMDOPClient.remote('cmdop_live_xxx');
 * const sessions = await client.terminal.list();
 * ```
 *
 * @example Auto-discover (local first, then remote)
 * ```typescript
 * const client = await CMDOPClient.discover();
 * ```
 */
export class CMDOPClient {
  private _transport: Transport;
  private _terminal: TerminalService | null = null;
  private _files: FilesService | null = null;
  private _agent: AgentService | null = null;
  private _extract: ExtractService | null = null;
  private _browser: BrowserService | null = null;
  private _download: DownloadService | null = null;
  private _sessionId: string = '';

  private constructor(transport: Transport) {
    this._transport = transport;
  }

  // ============================================================================
  // Factories
  // ============================================================================

  /**
   * Create a local client (sync).
   * Connects to a local agent via Unix socket / Named Pipe.
   *
   * Note: Transport connection is lazy — happens on first gRPC call.
   * Use `await client.connect()` if you need to pre-establish the connection.
   */
  static local(options?: LocalClientOptions): CMDOPClient {
    const transport = LocalTransport.fromOptions(options);
    return new CMDOPClient(transport);
  }

  /**
   * Create a remote client (sync).
   * Connects to a remote agent via cloud relay (grpc.cmdop.com).
   *
   * Note: Transport connection is lazy — happens on first gRPC call.
   */
  static remote(apiKey: string, options?: RemoteClientOptions): CMDOPClient {
    const transport = new RemoteTransport({ apiKey, ...options });
    return new CMDOPClient(transport);
  }

  /**
   * Auto-discover connection: tries local first, then remote via env var.
   * - Checks CMDOP_AGENT_INFO env var / ~/.cmdop/agent.info for local agent
   * - Falls back to CMDOP_API_KEY env var for remote connection
   */
  static async discover(): Promise<CMDOPClient> {
    // Try local agent discovery
    try {
      const transport = await LocalTransport.discover();
      return new CMDOPClient(transport);
    } catch {
      // Local not available — try remote via env var
    }

    const apiKey = process.env['CMDOP_API_KEY'];
    if (apiKey) {
      return CMDOPClient.remote(apiKey);
    }

    throw new ConnectionError(
      'No local agent found and CMDOP_API_KEY not set. ' +
      'Use CMDOPClient.local() or CMDOPClient.remote(apiKey) explicitly.'
    );
  }

  /**
   * Create a client from an existing transport instance.
   * Useful when you need to configure transport parameters manually.
   *
   * @example
   * ```typescript
   * const transport = new RemoteTransport({ apiKey: 'cmdop_live_xxx', server: 'custom.host:443' });
   * const client = CMDOPClient.fromTransport(transport);
   * ```
   */
  static fromTransport(transport: BaseTransport): CMDOPClient {
    return new CMDOPClient(transport);
  }

  /**
   * List all remote agents available for the given API key.
   *
   * @example
   * ```typescript
   * const agents = await CMDOPClient.listAgents('cmdop_live_xxx');
   * for (const agent of agents) {
   *   console.log(`${agent.name} (${agent.status})`);
   * }
   * ```
   */
  static async listAgents(apiKey: string): Promise<RemoteAgentInfo[]> {
    return new AgentDiscovery(apiKey).listAgents();
  }

  /**
   * List only online remote agents.
   *
   * @example
   * ```typescript
   * const agents = await CMDOPClient.getOnlineAgents('cmdop_live_xxx');
   * if (agents.length > 0) {
   *   const client = CMDOPClient.remote('cmdop_live_xxx');
   *   client.setSessionId(agents[0].agentId);
   * }
   * ```
   */
  static async getOnlineAgents(apiKey: string): Promise<RemoteAgentInfo[]> {
    return new AgentDiscovery(apiKey).getOnlineAgents();
  }

  // ============================================================================
  // Connection management
  // ============================================================================

  /**
   * Explicitly connect the transport.
   * Not required — connection is lazy by default.
   */
  async connect(): Promise<void> {
    await this._transport.connect();
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
   * Connection mode: 'local' for Unix socket / Named Pipe, 'remote' for cloud relay
   */
  get mode(): 'local' | 'remote' {
    return this._transport instanceof LocalTransport ? 'local' : 'remote';
  }

  /**
   * The underlying transport instance.
   * Useful for advanced configuration or direct transport access.
   */
  get transport(): BaseTransport {
    return this._transport as BaseTransport;
  }

  // ============================================================================
  // Services (lazy-init)
  // ============================================================================

  /**
   * Terminal service for session management and I/O
   */
  get terminal(): TerminalService {
    if (!this._terminal) {
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
      this._files = new FilesService(this._transport.createClient());
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
      this._agent = new AgentService(this._transport.createClient());
      if (this._sessionId) {
        this._agent.setSessionId(this._sessionId);
      }
    }
    return this._agent;
  }

  /**
   * Extract service for structured data extraction
   *
   * Uses a dedicated Extract RPC (more reliable than agent.extract()).
   */
  get extract(): ExtractService {
    if (!this._extract) {
      this._extract = new ExtractService(this._transport.createClient());
      if (this._sessionId) {
        this._extract.setSessionId(this._sessionId);
      }
    }
    return this._extract;
  }

  /**
   * Browser service for browser automation
   */
  get browser(): BrowserService {
    if (!this._browser) {
      this._browser = new BrowserService(this._transport.createClient());
      if (this._sessionId) {
        this._browser.setSessionId(this._sessionId);
      }
    }
    return this._browser;
  }

  /**
   * Download service for transferring files from agent to local disk.
   *
   * @example Download a remote file
   * ```typescript
   * const result = await client.download.downloadFile('/remote/data.csv', '/local/data.csv');
   * console.log(`Saved ${result.size} bytes to ${result.localPath}`);
   * ```
   *
   * @example Download a URL via agent
   * ```typescript
   * const result = await client.download.downloadUrl(
   *   'https://example.com/file.zip',
   *   '/local/file.zip'
   * );
   * ```
   */
  get download(): DownloadService {
    if (!this._download) {
      this._download = new DownloadService(this._transport.createClient());
      if (this._sessionId) {
        this._download.setSessionId(this._sessionId);
      }
    }
    return this._download;
  }

  // ============================================================================
  // Session routing
  // ============================================================================

  /**
   * Set target machine by hostname for all services at once.
   * Resolves hostname → session on each service (terminal, files, agent, etc).
   *
   * This is the recommended way to initialize machine routing — equivalent to
   * calling setMachine() on each service individually.
   *
   * @param hostname Machine hostname (exact or partial match)
   * @param partialMatch Use ICONTAINS match (default: true)
   *
   * @example
   * ```typescript
   * const client = CMDOPClient.remote('cmdop_live_xxx');
   * await client.setMachine('my-server');
   *
   * // All services now route to that machine
   * const files = await client.files.list('/tmp');
   * const result = await client.agent.run('Hello');
   * ```
   */
  async setMachine(hostname: string, partialMatch?: boolean): Promise<void> {
    // Set on all services (each caches its own sessionId)
    await this.terminal.setMachine(hostname, partialMatch);
    await this.files.setMachine(hostname, partialMatch);
    await this.agent.setMachine(hostname, partialMatch);
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
   * ```
   */
  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;

    // Set agent ID on transport for gRPC metadata routing (x-agent-id header)
    this._transport.setAgentId(sessionId);

    // Invalidate cached services so they get recreated with new transport client
    this._terminal = null;
    this._files = null;
    this._agent = null;
    this._extract = null;
    this._browser = null;
    this._download = null;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

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
    this._extract = null;
    this._browser = null;
    this._download = null;
    await this._transport.close();
  }

  /**
   * Explicit resource management (TypeScript 5.2+)
   *
   * @example
   * ```typescript
   * await using client = CMDOPClient.local();
   * // client is automatically closed when scope ends
   * ```
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
