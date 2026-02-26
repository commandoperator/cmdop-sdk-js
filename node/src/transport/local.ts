/**
 * Local transport for connecting to cmdop_go agent via Unix socket / Named Pipe
 */

import { createChannel, createClient } from 'nice-grpc';
import { readFile, access, unlink } from 'fs/promises';
import { constants } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { ConnectionError } from '@cmdop/core';

import {
  TerminalStreamingServiceDefinition,
} from '../proto/generated/service';
import type { AgentInfo, LocalTransportOptions } from './types';
import { DEFAULT_CHANNEL_OPTIONS, DISCOVERY_PATHS } from './types';
import { BaseTransport } from './base';

/**
 * Local transport for IPC connection to local agent
 */
export class LocalTransport extends BaseTransport {
  private _token: string | null = null;
  private _agentInfo: AgentInfo | null = null;

  private constructor(address: string, token?: string) {
    super(formatSocketAddress(address));
    this._token = token ?? null;
  }

  /**
   * Create a LocalTransport synchronously using explicit options.
   * Uses socketPath from options, or falls back to CMDOP_SOCKET_PATH env var,
   * or the first default discovery path.
   *
   * Connection is lazy — actual gRPC channel is created on first use.
   * Use discover() for full agent validation (ping check, token loading).
   */
  static fromOptions(options: LocalTransportOptions = {}): LocalTransport {
    const socketPath =
      options.socketPath ??
      process.env['CMDOP_SOCKET_PATH'] ??
      DISCOVERY_PATHS[0] ??
      `${process.env['HOME']}/.cmdop/agent.sock`;
    return new LocalTransport(socketPath);
  }

  /**
   * Discover and connect to local agent
   */
  static async discover(options: LocalTransportOptions = {}): Promise<LocalTransport> {
    if (options.socketPath) {
      const transport = new LocalTransport(options.socketPath);
      await transport.connect();
      return transport;
    }

    const discoveryPath = options.discoveryPath ?? await findDiscoveryFile();
    if (!discoveryPath) {
      throw new ConnectionError(
        'Agent not running. No discovery file found. Start agent with: cmdop agent start'
      );
    }

    const agentInfo = await readAgentInfo(discoveryPath);

    const isAlive = await pingAgent(agentInfo.address);
    if (!isAlive) {
      try {
        await unlink(discoveryPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new ConnectionError(
        'Agent crashed. Stale discovery file cleaned up. Restart agent with: cmdop agent start'
      );
    }

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

  get agentInfo(): AgentInfo | null {
    return this._agentInfo;
  }

  /** No-op for local transport — connects directly to one agent */
  setAgentId(_agentId: string): void {}
}

// ============================================================================
// Discovery helpers
// ============================================================================

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

async function readAgentInfo(path: string): Promise<AgentInfo> {
  try {
    const content = await readFile(path, 'utf-8');
    const info = JSON.parse(content) as AgentInfo;
    if (info.tokenPath?.startsWith('~')) {
      info.tokenPath = join(homedir(), info.tokenPath.slice(1));
    }
    return info;
  } catch (error) {
    throw new ConnectionError(`Failed to read agent info: ${path}`, error as Error);
  }
}

async function readToken(path: string): Promise<string> {
  const expandedPath = path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
  const content = await readFile(expandedPath, 'utf-8');
  return content.trim();
}

async function pingAgent(address: string): Promise<boolean> {
  try {
    const channel = createChannel(formatSocketAddress(address), undefined, {
      'grpc.initial_reconnect_backoff_ms': 100,
      'grpc.max_reconnect_backoff_ms': 100,
    });
    const client = createClient(TerminalStreamingServiceDefinition, channel);
    await client.healthCheck({});
    channel.close();
    return true;
  } catch {
    return false;
  }
}

function formatSocketAddress(address: string): string {
  if (address.startsWith('unix:') || address.startsWith('dns:')) {
    return address;
  }
  if (address.startsWith('/') || address.startsWith('.')) {
    return `unix://${address}`;
  }
  if (platform() === 'win32' && address.includes('pipe')) {
    return `unix://${address}`;
  }
  if (address.includes(':')) {
    return address;
  }
  return `unix://${address}`;
}
