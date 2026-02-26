import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentDiscovery, listAgents, getOnlineAgents } from '../src/discovery';
import { configure, resetSettings } from '../src/config';

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

const AGENT_ONLINE = {
  agent_id: 'agent-1',
  name: 'My Mac',
  hostname: 'macbook.local',
  platform: 'darwin',
  version: '2.20.0',
  status: 'online',
  last_seen: '2026-02-24T10:00:00Z',
  workspace_id: 'ws-1',
  labels: { env: 'dev' },
};

const AGENT_OFFLINE = {
  agent_id: 'agent-2',
  name: 'Linux Server',
  hostname: 'server.local',
  platform: 'linux',
  version: '2.18.0',
  status: 'offline',
  last_seen: null,
  workspace_id: 'ws-1',
  labels: null,
};

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => body,
    })
  );
}

// ──────────────────────────────────────────────────────────────────
// AgentDiscovery.listAgents
// ──────────────────────────────────────────────────────────────────

describe('AgentDiscovery.listAgents', () => {
  beforeEach(() => {
    configure({ apiBaseUrl: 'https://test.api.local' });
  });

  afterEach(() => {
    resetSettings();
    vi.unstubAllGlobals();
  });

  it('returns parsed agent list from agents key', async () => {
    mockFetch({ agents: [AGENT_ONLINE, AGENT_OFFLINE] });

    const discovery = new AgentDiscovery('cmdop_test_key');
    const agents = await discovery.listAgents();

    expect(agents).toHaveLength(2);
    const first = agents[0]!;
    const second = agents[1]!;
    expect(first.agentId).toBe('agent-1');
    expect(first.name).toBe('My Mac');
    expect(first.hostname).toBe('macbook.local');
    expect(first.platform).toBe('darwin');
    expect(first.version).toBe('2.20.0');
    expect(first.status).toBe('online');
    expect(first.isOnline).toBe(true);
    expect(first.labels).toEqual({ env: 'dev' });
    expect(first.lastSeen).toBeInstanceOf(Date);
    expect(second.isOnline).toBe(false);
  });

  it('also accepts results key (pagination format)', async () => {
    mockFetch({ results: [AGENT_ONLINE] });

    const discovery = new AgentDiscovery('key');
    const agents = await discovery.listAgents();

    expect(agents).toHaveLength(1);
  });

  it('sends Authorization header', async () => {
    mockFetch({ agents: [] });

    const discovery = new AgentDiscovery('cmdop_live_abc');
    await discovery.listAgents();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/sdk/agents/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer cmdop_live_abc',
        }),
      })
    );
  });

  it('throws AuthenticationError on 401', async () => {
    mockFetch({}, 401);

    const discovery = new AgentDiscovery('bad_key');
    await expect(discovery.listAgents()).rejects.toThrow('Invalid or expired API key');
  });

  it('throws PermissionError on 403', async () => {
    mockFetch({}, 403);

    const discovery = new AgentDiscovery('key');
    await expect(discovery.listAgents()).rejects.toThrow('API key lacks agent access');
  });

  it('throws generic error on non-2xx response', async () => {
    mockFetch({}, 500);

    const discovery = new AgentDiscovery('key');
    await expect(discovery.listAgents()).rejects.toThrow('Discovery API error: 500');
  });

  it('handles agent with missing optional fields gracefully', async () => {
    mockFetch({
      agents: [{ agent_id: 'x', status: 'offline' }],
    });

    const discovery = new AgentDiscovery('key');
    const agents = await discovery.listAgents();

    const agent = agents[0]!;
    expect(agent.agentId).toBe('x');
    expect(agent.name).toBe('Unknown'); // falls back to 'Unknown'
    expect(agent.hostname).toBe('');
    expect(agent.lastSeen).toBeNull();
    expect(agent.workspaceId).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
// AgentDiscovery.getOnlineAgents
// ──────────────────────────────────────────────────────────────────

describe('AgentDiscovery.getOnlineAgents', () => {
  beforeEach(() => {
    configure({ apiBaseUrl: 'https://test.api.local' });
  });

  afterEach(() => {
    resetSettings();
    vi.unstubAllGlobals();
  });

  it('returns only online agents', async () => {
    mockFetch({ agents: [AGENT_ONLINE, AGENT_OFFLINE] });

    const discovery = new AgentDiscovery('key');
    const agents = await discovery.getOnlineAgents();

    expect(agents).toHaveLength(1);
    const agent = agents[0]!;
    expect(agent.agentId).toBe('agent-1');
    expect(agent.isOnline).toBe(true);
  });

  it('returns empty array when no agents are online', async () => {
    mockFetch({ agents: [AGENT_OFFLINE] });

    const discovery = new AgentDiscovery('key');
    const agents = await discovery.getOnlineAgents();

    expect(agents).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// AgentDiscovery.getAgent
// ──────────────────────────────────────────────────────────────────

describe('AgentDiscovery.getAgent', () => {
  beforeEach(() => {
    configure({ apiBaseUrl: 'https://test.api.local' });
  });

  afterEach(() => {
    resetSettings();
    vi.unstubAllGlobals();
  });

  it('returns agent by ID', async () => {
    mockFetch(AGENT_ONLINE);

    const discovery = new AgentDiscovery('key');
    const agent = await discovery.getAgent('agent-1');

    expect(agent).not.toBeNull();
    expect(agent!.agentId).toBe('agent-1');
  });

  it('returns null on 404', async () => {
    mockFetch({}, 404);

    const discovery = new AgentDiscovery('key');
    const agent = await discovery.getAgent('nonexistent');

    expect(agent).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
// Convenience functions
// ──────────────────────────────────────────────────────────────────

describe('listAgents / getOnlineAgents convenience functions', () => {
  beforeEach(() => {
    configure({ apiBaseUrl: 'https://test.api.local' });
  });

  afterEach(() => {
    resetSettings();
    vi.unstubAllGlobals();
  });

  it('listAgents() returns all agents', async () => {
    mockFetch({ agents: [AGENT_ONLINE, AGENT_OFFLINE] });

    const agents = await listAgents('key');
    expect(agents).toHaveLength(2);
  });

  it('getOnlineAgents() returns only online agents', async () => {
    mockFetch({ agents: [AGENT_ONLINE, AGENT_OFFLINE] });

    const agents = await getOnlineAgents('key');
    expect(agents).toHaveLength(1);
    expect(agents[0]!.isOnline).toBe(true);
  });
});
