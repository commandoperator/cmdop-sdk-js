/**
 * Transport layer types and interfaces
 */

import type { Channel } from 'nice-grpc';
import type { TerminalStreamingServiceClient } from '../proto/generated/service';

/**
 * Base transport interface for all connection types
 */
export interface Transport {
  /** The underlying gRPC channel */
  readonly channel: Channel;

  /** Whether the transport is currently connected */
  readonly isConnected: boolean;

  /** The address this transport is connected to */
  readonly address: string;

  /** Connect to the remote endpoint */
  connect(): Promise<void>;

  /** Close the connection and cleanup resources */
  close(): Promise<void>;

  /** Create a typed gRPC client for the terminal service */
  createClient(): TerminalStreamingServiceClient;

  /**
   * Set agent ID for routing (remote only).
   * This is used to route requests to a specific machine via x-agent-id header.
   * No-op for local transport.
   */
  setAgentId(agentId: string): void;
}

/**
 * Agent discovery info from ~/.cmdop/agent.info
 */
export interface AgentInfo {
  version: string;
  pid: number;
  transport: 'unix' | 'pipe' | 'tcp';
  address: string;
  tokenPath?: string;
  startedAt: string;
}

/**
 * Local transport options
 */
export interface LocalTransportOptions {
  /** Override the default discovery path */
  discoveryPath?: string;
  /** Direct socket path (bypasses discovery) */
  socketPath?: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * Remote transport options
 */
export interface RemoteTransportOptions {
  /** API key for authentication */
  apiKey: string;
  /** Target agent ID (optional, uses default if not specified) */
  agentId?: string;
  /** Server address (default: grpc.cmdop.com:443) */
  server?: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * gRPC channel options for keepalive and performance
 */
export const DEFAULT_CHANNEL_OPTIONS = {
  'grpc.keepalive_time_ms': 10000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.http2.min_time_between_pings_ms': 10000,
} as const;

/**
 * Default remote server address
 */
export const DEFAULT_SERVER = 'grpc.cmdop.com:443';

/**
 * Default discovery paths (in priority order)
 */
export const DISCOVERY_PATHS = [
  process.env.CMDOP_AGENT_INFO,
  `${process.env.HOME}/.cmdop/agent.info`,
  '/var/run/cmdop/agent.info',
].filter(Boolean) as string[];
