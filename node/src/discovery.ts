/**
 * Remote agent discovery via REST API.
 *
 * Uses the generated machines API client from @cmdop/core.
 * For local agent discovery (auto-connecting to a running agent), see
 * transport/local.ts (LocalTransport.discover()).
 */

import { getSettings } from './config';
import {
  MachinesModule,
  AuthenticationError,
  PermissionError,
} from '@cmdop/core';

type Machine = MachinesModule.MachinesMachinesTypes.Machine;

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

function machineToAgentInfo(m: Machine): RemoteAgentInfo {
  let lastSeen: Date | null = null;
  if (m.last_seen) {
    try {
      lastSeen = new Date(m.last_seen);
    } catch {
      // ignore
    }
  }

  const status: AgentStatus = m.is_online ? 'online' : 'offline';

  return {
    agentId: m.id,
    name: m.name || m.hostname || 'Unknown',
    hostname: m.hostname,
    platform: m.os || '',
    version: m.agent_version || '',
    status,
    lastSeen,
    workspaceId: m.workspace || null,
    labels: null,
    isOnline: m.is_online,
  };
}

function createAPI(apiKey: string): MachinesModule.API {
  const baseUrl = getSettings().apiBaseUrl;
  const api = new MachinesModule.API(baseUrl, {
    storage: new MachinesModule.MemoryStorageAdapter(),
  });
  api.setToken(apiKey);
  return api;
}

// ============================================================================
// AgentDiscovery
// ============================================================================

/**
 * Remote agent discovery client.
 *
 * Lists agents available for an API key via the machines REST API.
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
  private _api: MachinesModule.API;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
    this._api = createAPI(apiKey);
  }

  /**
   * List all agents available for this API key.
   * Fetches all pages of machines from the workspace.
   *
   * @throws {AuthenticationError} on invalid API key
   * @throws {PermissionError} on insufficient permissions
   */
  async listAgents(): Promise<RemoteAgentInfo[]> {
    try {
      const all: RemoteAgentInfo[] = [];
      let page = 1;

      while (true) {
        const result = await this._api.machines_machines.machinesList({
          page,
          page_size: 100,
        });
        all.push(...result.results.map(machineToAgentInfo));
        if (!result.has_next) break;
        page++;
      }

      return all;
    } catch (err) {
      if (err instanceof MachinesModule.APIError) {
        if (err.statusCode === 401) {
          throw new AuthenticationError('Invalid or expired API key');
        }
        if (err.statusCode === 403) {
          throw new PermissionError('API key lacks agent access');
        }
      }
      throw err;
    }
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
    try {
      const machine = await this._api.machines_machines.machinesRetrieve(agentId);
      return machineToAgentInfo(machine);
    } catch (err) {
      if (err instanceof MachinesModule.APIError) {
        if (err.statusCode === 404) return null;
        if (err.statusCode === 401) {
          throw new AuthenticationError('Invalid or expired API key');
        }
      }
      throw err;
    }
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
