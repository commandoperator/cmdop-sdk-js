import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { consola } from 'consola';

let tmpDir: string;
let origConfigDir: string | undefined;
let origApiKey: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'cmdop-resolve-test-'));
  origConfigDir = process.env.CMDOP_CONFIG_DIR;
  origApiKey = process.env.CMDOP_API_KEY;
  process.env.CMDOP_CONFIG_DIR = tmpDir;
  delete process.env.CMDOP_API_KEY;
});

afterEach(() => {
  if (origConfigDir === undefined) delete process.env.CMDOP_CONFIG_DIR;
  else process.env.CMDOP_CONFIG_DIR = origConfigDir;
  if (origApiKey === undefined) delete process.env.CMDOP_API_KEY;
  else process.env.CMDOP_API_KEY = origApiKey;
  rmSync(tmpDir, { recursive: true, force: true });
});

// Import real sort/format functions before mocking
import { filterAndSortMachines as realFilter, formatMachineLabels as realFormat } from '../machines.js';

// Mock machines module with default empty fetch
mock.module('../machines.js', () => ({
  fetchMachines: async () => [],
  filterAndSortMachines: realFilter,
  formatMachineLabels: realFormat,
}));

import { resolveApiKey, resolveHostname } from '../resolve.js';
import { saveConfig, loadConfig } from '../config.js';

const TEST_API_KEY = 'test_api_key';

function makeMachine(hostname: string, isOnline = true) {
  return {
    id: '1', workspace: 'ws', workspace_name: 'WS', name: hostname,
    hostname, os: 'linux', is_online: isOnline, status: isOnline ? 'online' : 'offline',
    status_emoji: '', heartbeat_age_seconds: 0, local_ips: [],
    last_seen: new Date().toISOString(), created_at: '2025-01-01', active_terminal_session: null,
  };
}

describe('resolveApiKey', () => {
  it('returns flag value when provided', async () => {
    const result = await resolveApiKey('flag_key');
    expect(result).toBe('flag_key');
  });

  it('returns env var when no flag', async () => {
    process.env.CMDOP_API_KEY = 'env_key';
    const result = await resolveApiKey('');
    expect(result).toBe('env_key');
  });

  it('prefers flag over env', async () => {
    process.env.CMDOP_API_KEY = 'env_key';
    const result = await resolveApiKey('flag_key');
    expect(result).toBe('flag_key');
  });

  it('returns saved config when no flag or env', async () => {
    saveConfig({ apiKey: 'saved_key', recentHosts: [] });
    const result = await resolveApiKey('');
    expect(result).toBe('saved_key');
  });

  it('prompts interactively when nothing is set', async () => {
    const promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve('prompted_key');
    }) as any);

    const result = await resolveApiKey('');
    expect(result).toBe('prompted_key');

    const cfg = loadConfig();
    expect(cfg.apiKey).toBe('prompted_key');

    promptSpy.mockRestore();
  });

  it('returns null when interactive prompt is cancelled', async () => {
    const promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve(Symbol('cancel'));
    }) as any);

    const result = await resolveApiKey('');
    expect(result).toBeNull();

    promptSpy.mockRestore();
  });
});

describe('resolveHostname', () => {
  it('returns argument hostname with machineId from API', async () => {
    mock.module('../machines.js', () => ({
      fetchMachines: async () => [makeMachine('my-server')],
      filterAndSortMachines: realFilter,
      formatMachineLabels: realFormat,
    }));

    const { resolveHostname: rh } = await import('../resolve.js');
    const result = await rh('my-server', TEST_API_KEY);
    expect(result).toEqual({ hostname: 'my-server', machineId: '1' });
  });

  it('returns argument hostname with empty machineId when not found', async () => {
    const result = await resolveHostname('unknown-host', TEST_API_KEY);
    expect(result).toEqual({ hostname: 'unknown-host', machineId: '' });
  });

  it('adds argument hostname to recent hosts', async () => {
    await resolveHostname('my-server', TEST_API_KEY);
    const cfg = loadConfig();
    expect(cfg.recentHosts).toContain('my-server');
  });

  it('shows machine picker when API returns machines', async () => {
    mock.module('../machines.js', () => ({
      fetchMachines: async () => [makeMachine('server-a')],
      filterAndSortMachines: realFilter,
      formatMachineLabels: realFormat,
    }));

    const promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve('server-a');
    }) as any);

    const { resolveHostname: rh } = await import('../resolve.js');
    const result = await rh('', TEST_API_KEY);
    expect(result).toEqual({ hostname: 'server-a', machineId: '1' });

    expect(promptSpy).toHaveBeenCalledWith('Select machine', expect.objectContaining({ type: 'select' }));

    promptSpy.mockRestore();
  });

  it('returns null on API error', async () => {
    mock.module('../machines.js', () => ({
      fetchMachines: async () => { throw new Error('Network error'); },
      filterAndSortMachines: realFilter,
      formatMachineLabels: realFormat,
    }));

    const { resolveHostname: rh } = await import('../resolve.js');
    const result = await rh('', TEST_API_KEY);
    expect(result).toBeNull();
  });

  it('prompts for manual hostname when no machines found', async () => {
    mock.module('../machines.js', () => ({
      fetchMachines: async () => [],
      filterAndSortMachines: realFilter,
      formatMachineLabels: realFormat,
    }));

    const promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve('manual-host');
    }) as any);

    const { resolveHostname: rh } = await import('../resolve.js');
    const result = await rh('', TEST_API_KEY);
    expect(result).toEqual({ hostname: 'manual-host', machineId: '' });

    expect(promptSpy).toHaveBeenCalledWith('Hostname', expect.objectContaining({ type: 'text' }));

    promptSpy.mockRestore();
  });

  it('adds selected machine to recent hosts', async () => {
    mock.module('../machines.js', () => ({
      fetchMachines: async () => [makeMachine('my-box')],
      filterAndSortMachines: realFilter,
      formatMachineLabels: realFormat,
    }));

    const promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve('my-box');
    }) as any);

    const { resolveHostname: rh } = await import('../resolve.js');
    await rh('', TEST_API_KEY);
    const cfg = loadConfig();
    expect(cfg.recentHosts[0]).toBe('my-box');

    promptSpy.mockRestore();
  });

  it('returns null when picker is cancelled', async () => {
    mock.module('../machines.js', () => ({
      fetchMachines: async () => [makeMachine('my-box')],
      filterAndSortMachines: realFilter,
      formatMachineLabels: realFormat,
    }));

    const promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve(Symbol('cancel'));
    }) as any);

    const { resolveHostname: rh } = await import('../resolve.js');
    const result = await rh('', TEST_API_KEY);
    expect(result).toBeNull();

    promptSpy.mockRestore();
  });
});
