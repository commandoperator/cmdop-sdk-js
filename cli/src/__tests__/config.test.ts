import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let tmpDir: string;
let origConfigDir: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'cmdop-test-'));
  origConfigDir = process.env.CMDOP_CONFIG_DIR;
  process.env.CMDOP_CONFIG_DIR = tmpDir;
});

afterEach(() => {
  if (origConfigDir === undefined) delete process.env.CMDOP_CONFIG_DIR;
  else process.env.CMDOP_CONFIG_DIR = origConfigDir;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('config', () => {
  // Re-import each time since env is set in beforeEach
  async function getConfig() {
    return await import('../config.js');
  }

  describe('loadConfig', () => {
    it('returns defaults when no config file exists', async () => {
      const { loadConfig } = await getConfig();
      const cfg = loadConfig();
      expect(cfg).toEqual({ recentHosts: [] });
      expect(cfg.apiKey).toBeUndefined();
      expect(cfg.server).toBeUndefined();
    });

    it('reads saved config', async () => {
      const { loadConfig, saveConfig } = await getConfig();
      saveConfig({ apiKey: 'test_key', recentHosts: ['host1'] });
      const cfg = loadConfig();
      expect(cfg.apiKey).toBe('test_key');
      expect(cfg.recentHosts).toEqual(['host1']);
    });

    it('returns defaults on invalid JSON', async () => {
      const { loadConfig, getConfigPath } = await getConfig();
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname } = await import('node:path');
      const path = getConfigPath();
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, 'not json', 'utf-8');
      const cfg = loadConfig();
      expect(cfg).toEqual({ recentHosts: [] });
    });
  });

  describe('saveConfig', () => {
    it('creates directories and writes JSON', async () => {
      const { saveConfig, getConfigPath } = await getConfig();
      saveConfig({ apiKey: 'key123', recentHosts: ['a', 'b'] });
      const raw = readFileSync(getConfigPath(), 'utf-8');
      const data = JSON.parse(raw);
      expect(data.apiKey).toBe('key123');
      expect(data.recentHosts).toEqual(['a', 'b']);
    });

    it('overwrites existing config', async () => {
      const { saveConfig, loadConfig } = await getConfig();
      saveConfig({ apiKey: 'old', recentHosts: [] });
      saveConfig({ apiKey: 'new', recentHosts: ['x'] });
      const cfg = loadConfig();
      expect(cfg.apiKey).toBe('new');
      expect(cfg.recentHosts).toEqual(['x']);
    });
  });

  describe('deleteConfig', () => {
    it('removes config file', async () => {
      const { saveConfig, deleteConfig, loadConfig } = await getConfig();
      saveConfig({ apiKey: 'key', recentHosts: [] });
      deleteConfig();
      const cfg = loadConfig();
      expect(cfg.apiKey).toBeUndefined();
    });

    it('does not throw when no config exists', async () => {
      const { deleteConfig } = await getConfig();
      expect(() => deleteConfig()).not.toThrow();
    });
  });

  describe('addRecentHost', () => {
    it('adds hostname to empty list', async () => {
      const { addRecentHost, loadConfig } = await getConfig();
      addRecentHost('server-1');
      expect(loadConfig().recentHosts).toEqual(['server-1']);
    });

    it('prepends new hostname', async () => {
      const { addRecentHost, saveConfig, loadConfig } = await getConfig();
      saveConfig({ recentHosts: ['old'] });
      addRecentHost('new');
      expect(loadConfig().recentHosts).toEqual(['new', 'old']);
    });

    it('deduplicates existing hostname', async () => {
      const { addRecentHost, saveConfig, loadConfig } = await getConfig();
      saveConfig({ recentHosts: ['a', 'b', 'c'] });
      addRecentHost('b');
      expect(loadConfig().recentHosts).toEqual(['b', 'a', 'c']);
    });

    it('limits to 5 hosts', async () => {
      const { addRecentHost, saveConfig, loadConfig } = await getConfig();
      saveConfig({ recentHosts: ['h1', 'h2', 'h3', 'h4', 'h5'] });
      addRecentHost('h6');
      const hosts = loadConfig().recentHosts;
      expect(hosts).toHaveLength(5);
      expect(hosts[0]).toBe('h6');
      expect(hosts).not.toContain('h5');
    });
  });

  describe('maskApiKey', () => {
    it('masks short keys completely', async () => {
      const { maskApiKey } = await getConfig();
      expect(maskApiKey('short')).toBe('****');
      expect(maskApiKey('exactly15chars!')).toBe('****');
    });

    it('shows prefix and suffix for long keys', async () => {
      const { maskApiKey } = await getConfig();
      const masked = maskApiKey('cmdop_live_abcdefgh1234');
      expect(masked).toBe('cmdop_live_a...1234');
    });
  });

  describe('getConfigPath', () => {
    it('returns path under CMDOP_CONFIG_DIR', async () => {
      const { getConfigPath } = await getConfig();
      expect(getConfigPath()).toBe(join(tmpDir, 'config.json'));
    });
  });
});
