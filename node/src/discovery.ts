/**
 * Remote agent discovery via REST API.
 *
 * Lists agents available for an API key from the cloud management API.
 * For local agent discovery (auto-connecting to a running agent), see
 * transport/local.ts (LocalTransport.discover()).
 */

import { getSettings } from './config';
import { AuthenticationError, PermissionError } from '@cmdop/core';

// ============================================================================
// Types
// ============================================================================

export type AgentStatus = 'online' | 'offline' | 'busy';

export interface RemoteAgentInfo {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Machine hostname */
  hostname: string;
  /** OS platform: darwin, linux, windows */
  platform: string;
  /** Agent version string */
  version: string;
  /** Current agent status */
  status: AgentStatus;
  /** Last time agent was seen online */
  lastSeen: Date | null;
  /** Workspace this agent belongs to */
  workspaceId: string | null;
  /** Optional agent labels/tags */
  labels: Record<string, string> | null;
  /** Whether agent is currently online */
  isOnline: boolean;
}

// ============================================================================
// Internal helpers
// ============================================================================

function parseRemoteAgentInfo(data: Record<string, unknown>): RemoteAgentInfo {
  let lastSeen: Date | null = null;
  if (data['last_seen']) {
    try {
      lastSeen = new Date(String(data['last_seen']));
    } catch {
      // ignore
    }
  }

  const status = (data['status'] as AgentStatus | undefined) ?? 'offline';

  return {
    agentId: String(data['agent_id'] ?? ''),
    name: String(data['name'] ?? data['hostname'] ?? 'Unknown'),
    hostname: String(data['hostname'] ?? ''),
    platform: String(data['platform'] ?? ''),
    version: String(data['version'] ?? ''),
    status,
    lastSeen,
    workspaceId: data['workspace_id'] != null ? String(data['workspace_id']) : null,
    labels: (data['labels'] as Record<string, string> | null) ?? null,
    isOnline: status === 'online',
  };
}

// ============================================================================
// AgentDiscovery
// ============================================================================

/**
 * Remote agent discovery client.
 *
 * Lists agents available for an API key via REST API.
 * Use `AgentDiscovery.listAgents(apiKey)` or `CMDOPClient.listAgents(apiKey)`.
 *
 * @example
 * ```typescript
 * const discovery = new AgentDiscovery('cmdop_live_xxx');
 * const agents = await discovery.listAgents();
 * const online = await discovery.getOnlineAgents();
 * const agent = await discovery.getAgent('agent-uuid');
 * ```
 */
export class AgentDiscovery {
  private readonly _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  private get _baseUrl(): string {
    return getSettings().apiBaseUrl;
  }

  private get _headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this._apiKey}`,
      Accept: 'application/json',
      'User-Agent': 'cmdop-sdk-node/0.1.0',
    };
  }

  /**
   * List all agents available for this API key.
   *
   * @throws {AuthenticationError} on invalid API key
   * @throws {PermissionDeniedError} on insufficient permissions
   */
  async listAgents(): Promise<RemoteAgentInfo[]> {
    const response = await fetch(`${this._baseUrl}/api/v1/sdk/agents/`, {
      headers: this._headers,
    });

    if (response.status === 401) {
      throw new AuthenticationError('Invalid or expired API key');
    }
    if (response.status === 403) {
      throw new PermissionError('API key lacks agent access');
    }
    if (!response.ok) {
      throw new Error(`Discovery API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = (data['agents'] ?? data['results'] ?? []) as Record<string, unknown>[];
    return items.map(parseRemoteAgentInfo);
  }

  /**
   * List only online agents.
   */
  async getOnlineAgents(): Promise<RemoteAgentInfo[]> {
    const agents = await this.listAgents();
    return agents.filter((a) => a.isOnline);
  }

  /**
   * Get a specific agent by ID.
   * Returns `null` if not found.
   */
  async getAgent(agentId: string): Promise<RemoteAgentInfo | null> {
    const response = await fetch(`${this._baseUrl}/api/v1/sdk/agents/${agentId}/`, {
      headers: this._headers,
    });

    if (response.status === 404) return null;
    if (response.status === 401) {
      throw new AuthenticationError('Invalid or expired API key');
    }
    if (!response.ok) {
      throw new Error(`Discovery API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return parseRemoteAgentInfo(data);
  }

  /**
   * Wait for an agent to come online.
   *
   * @param agentId Agent UUID to wait for
   * @param options.timeoutMs Maximum time to wait (default: 30000)
   * @param options.pollIntervalMs Time between checks (default: 2000)
   * @throws {Error} if agent doesn't come online within timeout
   */
  async waitForAgent(
    agentId: string,
    options?: { timeoutMs?: number; pollIntervalMs?: number }
  ): Promise<RemoteAgentInfo> {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 2_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const agent = await this.getAgent(agentId);
      if (agent?.isOnline) return agent;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Agent ${agentId} did not come online within ${timeoutMs}ms`);
  }
}

// ============================================================================
// Convenience functions
// ============================================================================

/**
 * List all agents available for an API key.
 *
 * @example
 * ```typescript
 * import { listAgents } from '@cmdop/node';
 * const agents = await listAgents('cmdop_live_xxx');
 * ```
 */
export async function listAgents(apiKey: string): Promise<RemoteAgentInfo[]> {
  return new AgentDiscovery(apiKey).listAgents();
}

/**
 * List only online agents for an API key.
 *
 * @example
 * ```typescript
 * import { getOnlineAgents } from '@cmdop/node';
 * const agents = await getOnlineAgents('cmdop_live_xxx');
 * for (const agent of agents) {
 *   console.log(`${agent.name} (${agent.hostname})`);
 * }
 * ```
 */
export async function getOnlineAgents(apiKey: string): Promise<RemoteAgentInfo[]> {
  return new AgentDiscovery(apiKey).getOnlineAgents();
}
