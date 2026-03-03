import { describe, it, expect, mock } from 'bun:test';

// Mock @cmdop/core and @cmdop/node before importing machines
mock.module('@cmdop/core', () => ({
  MachinesModule: {
    API: class {
      machines_machines = { machinesList: async () => ({ results: [], has_next: false }) };
      setToken() {}
    },
    MemoryStorageAdapter: class {},
  },
}));
mock.module('@cmdop/node', () => ({
  getSettings: () => ({ apiBaseUrl: 'https://api.cmdop.com' }),
}));

import { filterAndSortMachines, formatMachineLabels, type MachineInfo } from '../machines.js';

function makeMachine(overrides: Partial<MachineInfo> = {}): MachineInfo {
  return {
    id: 'machine-1',
    name: 'test-machine',
    hostname: 'test-host',
    os: 'linux',
    is_online: true,
    status: 'online',
    last_seen: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('filterAndSortMachines', () => {
  it('puts recent hosts first in recentHosts order', () => {
    const machines = [
      makeMachine({ hostname: 'alpha' }),
      makeMachine({ hostname: 'beta' }),
      makeMachine({ hostname: 'gamma' }),
    ];
    const sorted = filterAndSortMachines(machines, ['gamma', 'alpha']);
    expect(sorted.map((m) => m.hostname)).toEqual(['gamma', 'alpha', 'beta']);
  });

  it('puts online before offline', () => {
    const machines = [
      makeMachine({ hostname: 'offline-1', is_online: false }),
      makeMachine({ hostname: 'online-1', is_online: true }),
    ];
    // offline-1 not in recentHosts → filtered out
    const sorted = filterAndSortMachines(machines, []);
    expect(sorted.length).toBe(1);
    expect(sorted[0]!.hostname).toBe('online-1');
  });

  it('keeps offline machines that are in recentHosts', () => {
    const machines = [
      makeMachine({ hostname: 'offline-recent', is_online: false }),
      makeMachine({ hostname: 'online-1', is_online: true }),
    ];
    const sorted = filterAndSortMachines(machines, ['offline-recent']);
    expect(sorted.length).toBe(2);
    expect(sorted[0]!.hostname).toBe('offline-recent');
  });

  it('removes offline machines not in recentHosts', () => {
    const machines = [
      makeMachine({ hostname: 'offline-unknown', is_online: false }),
      makeMachine({ hostname: 'online-1', is_online: true }),
    ];
    const sorted = filterAndSortMachines(machines, []);
    expect(sorted.length).toBe(1);
    expect(sorted[0]!.hostname).toBe('online-1');
  });

  it('sorts by last_seen descending within same status', () => {
    const machines = [
      makeMachine({ hostname: 'old', is_online: true, last_seen: '2025-01-01T00:00:00Z' }),
      makeMachine({ hostname: 'new', is_online: true, last_seen: '2025-06-01T00:00:00Z' }),
    ];
    const sorted = filterAndSortMachines(machines, []);
    expect(sorted[0]!.hostname).toBe('new');
    expect(sorted[1]!.hostname).toBe('old');
  });

  it('handles null last_seen', () => {
    const machines = [
      makeMachine({ hostname: 'no-seen', is_online: true, last_seen: null }),
      makeMachine({ hostname: 'seen', is_online: true, last_seen: '2025-01-01T00:00:00Z' }),
    ];
    const sorted = filterAndSortMachines(machines, []);
    expect(sorted[0]!.hostname).toBe('seen');
    expect(sorted[1]!.hostname).toBe('no-seen');
  });

  it('does not mutate original array', () => {
    const machines = [
      makeMachine({ hostname: 'b' }),
      makeMachine({ hostname: 'a' }),
    ];
    const original = [...machines];
    filterAndSortMachines(machines, ['a']);
    expect(machines[0]!.hostname).toBe(original[0]!.hostname);
  });
});

describe('formatMachineLabels', () => {
  it('formats online machine with aligned columns', () => {
    const machines = [makeMachine({ hostname: 'my-server', os: 'linux' })];
    const labels = formatMachineLabels(machines, []);
    expect(labels[0]!.label).toContain('my-server');
    expect(labels[0]!.label).toContain('linux');
    expect(labels[0]!.label).toContain('\u25CF');
    expect(labels[0]!.label).toContain('online');
    expect(labels[0]!.label).not.toContain('last used');
    expect(labels[0]!.value).toBe('my-server');
  });

  it('formats offline machine', () => {
    const machines = [makeMachine({ hostname: 'staging', os: 'macos', is_online: false })];
    const labels = formatMachineLabels(machines, []);
    expect(labels[0]!.label).toContain('staging');
    expect(labels[0]!.label).toContain('macos');
    expect(labels[0]!.label).toContain('\u25CB');
    expect(labels[0]!.label).toContain('offline');
  });

  it('adds (last used) for recent machines', () => {
    const machines = [makeMachine({ hostname: 'recent-box' })];
    const labels = formatMachineLabels(machines, ['recent-box']);
    expect(labels[0]!.label).toContain('(last used)');
  });

  it('aligns columns based on longest hostname', () => {
    const machines = [
      makeMachine({ hostname: 'short', os: 'linux' }),
      makeMachine({ hostname: 'very-long-hostname-here', os: 'macos' }),
    ];
    const labels = formatMachineLabels(machines, []);
    // Both labels should have os starting at same position
    const osPos0 = labels[0]!.label.indexOf('linux');
    const osPos1 = labels[1]!.label.indexOf('macos');
    expect(osPos0).toBe(osPos1);
  });
});
