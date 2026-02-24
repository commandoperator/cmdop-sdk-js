/**
 * Local transport for connecting to cmdop_go agent via Unix socket / Named Pipe
 */

import { createChannel, createClient, type Channel } from 'nice-grpc';
import { readFile, access, unlink } from 'fs/promises';
import { constants } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { ConnectionError } from '@cmdop/core';

import {
  TerminalStreamingServiceDefinition,
  type TerminalStreamingServiceClient,
} from '../generated/service';
import type {
  Transport,
  AgentInfo,
  LocalTransportOptions,
} from './types';
import { DEFAULT_CHANNEL_OPTIONS, DISCOVERY_PATHS } from './types';

/**
 * Local transport for IPC connection to local agent
 */
export class LocalTransport implements Transport {
  private _channel: Channel | null = null;
  private _client: TerminalStreamingServiceClient | null = null;
  private _address: string;
  private _token: string | null = null;
  private _agentInfo: AgentInfo | null = null;

  private constructor(address: string, token?: string) {
    this._address = address;
    this._token = token ?? null;
  }

  /**
   * Discover and connect to local agent
   */
  static async discover(options: LocalTransportOptions = {}): Promise<LocalTransport> {
    // If socket path is provided directly, use it
    if (options.socketPath) {
      const transport = new LocalTransport(options.socketPath);
      await transport.connect();
      return transport;
    }

    // Otherwise, discover via agent.info file
    const discoveryPath = options.discoveryPath ?? await findDiscoveryFile();
    if (!discoveryPath) {
      throw new ConnectionError(
        'Agent not running. No discovery file found. Start agent with: cmdop agent start'
      );
    }

    const agentInfo = await readAgentInfo(discoveryPath);

    // Verify agent is alive
    const isAlive = await pingAgent(agentInfo.address);
    if (!isAlive) {
      // Cleanup stale file
      try {
        await unlink(discoveryPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new ConnectionError(
        'Agent crashed. Stale discovery file cleaned up. Restart agent with: cmdop agent start'
      );
    }

    // Read token if available
    let token: string | undefined;
    if (agentInfo.tokenPath) {
      try {
        token = await readToken(agentInfo.tokenPath);
      } catch {
        // Token file might not exist, continue without it
      }
    }

    const transport = new LocalTransport(agentInfo.address, token);
    transport._agentInfo = agentInfo;
    await transport.connect();
    return transport;
  }

  get channel(): Channel {
    if (!this._channel) {
      throw new ConnectionError('Transport not connected');
    }
    return this._channel;
  }

  get isConnected(): boolean {
    return this._channel !== null;
  }

  get address(): string {
    return this._address;
  }

  get agentInfo(): AgentInfo | null {
    return this._agentInfo;
  }

  async connect(): Promise<void> {
    if (this._channel) {
      return; // Already connected
    }

    const address = formatSocketAddress(this._address);
    this._channel = createChannel(address, undefined, DEFAULT_CHANNEL_OPTIONS);
  }

  async close(): Promise<void> {
    if (this._channel) {
      this._channel.close();
      this._channel = null;
      this._client = null;
    }
  }

  createClient(): TerminalStreamingServiceClient {
    if (!this._client) {
      this._client = createClient(TerminalStreamingServiceDefinition, this.channel);
    }
    return this._client;
  }

  /**
   * Set agent ID (no-op for local transport)
   * Local transport doesn't need routing since it connects directly to one agent.
   */
  setAgentId(_agentId: string): void {
    // No-op for local transport
  }

  /**
   * Explicit resource management (TypeScript 5.2+)
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

// ============================================================================
// Discovery helpers
// ============================================================================

/**
 * Find the first available discovery file
 */
async function findDiscoveryFile(): Promise<string | undefined> {
  for (const path of DISCOVERY_PATHS) {
    if (!path) continue;
    try {
      await access(path, constants.R_OK);
      return path;
    } catch {
      continue;
    }
  }
  return undefined;
}

/**
 * Read and parse agent.info file
 */
async function readAgentInfo(path: string): Promise<AgentInfo> {
  try {
    const content = await readFile(path, 'utf-8');
    const info = JSON.parse(content) as AgentInfo;

    // Expand ~ in tokenPath
    if (info.tokenPath?.startsWith('~')) {
      info.tokenPath = join(homedir(), info.tokenPath.slice(1));
    }

    return info;
  } catch (error) {
    throw new ConnectionError(`Failed to read agent info: ${path}`, error as Error);
  }
}

/**
 * Read authentication token from file
 */
async function readToken(path: string): Promise<string> {
  const expandedPath = path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
  const content = await readFile(expandedPath, 'utf-8');
  return content.trim();
}

/**
 * Check if agent is alive by attempting to connect
 */
async function pingAgent(address: string): Promise<boolean> {
  try {
    const formattedAddress = formatSocketAddress(address);
    const channel = createChannel(formattedAddress, undefined, {
      'grpc.initial_reconnect_backoff_ms': 100,
      'grpc.max_reconnect_backoff_ms': 100,
    });

    // Create client and try health check
    const client = createClient(TerminalStreamingServiceDefinition, channel);
    await client.healthCheck({});
    channel.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Format socket address for gRPC
 */
function formatSocketAddress(address: string): string {
  // Already formatted
  if (address.startsWith('unix:') || address.startsWith('dns:')) {
    return address;
  }

  // Unix socket path
  if (address.startsWith('/') || address.startsWith('.')) {
    return `unix://${address}`;
  }

  // Windows named pipe
  if (platform() === 'win32' && address.includes('pipe')) {
    return `unix://${address}`;
  }

  // TCP address
  if (address.includes(':')) {
    return address;
  }

  // Default to unix socket
  return `unix://${address}`;
}
