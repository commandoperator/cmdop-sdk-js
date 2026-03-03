import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let tmpDir: string;
let origConfigDir: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'cmdop-login-test-'));
  origConfigDir = process.env.CMDOP_CONFIG_DIR;
  process.env.CMDOP_CONFIG_DIR = tmpDir;
});

afterEach(() => {
  if (origConfigDir === undefined) delete process.env.CMDOP_CONFIG_DIR;
  else process.env.CMDOP_CONFIG_DIR = origConfigDir;
  rmSync(tmpDir, { recursive: true, force: true });
});

// Mock CMDOPClient
const mockClose = mock(() => Promise.resolve());
const mockHealthCheck = mock(() => Promise.resolve({ healthy: true, version: '1.0', activeSessions: 0, connectedClients: 0 }));

mock.module('@cmdop/node', () => ({
  CMDOPClient: {
    remote: mock(() => ({
      healthCheck: mockHealthCheck,
      close: mockClose,
    })),
  },
}));

// We'll control consola.prompt via spyOn after import
import { consola } from 'consola';
import { cmdLogin } from '../commands/login.js';
import { loadConfig, saveConfig } from '../config.js';

describe('cmdLogin', () => {
  let promptSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    promptSpy?.mockRestore();
    mockHealthCheck.mockReset();
    mockHealthCheck.mockImplementation(() =>
      Promise.resolve({ healthy: true, version: '1.0', activeSessions: 0, connectedClients: 0 }),
    );
    mockClose.mockReset();
    mockClose.mockImplementation(() => Promise.resolve());
  });

  it('saves config on successful login', async () => {
    promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve('cmdop_live_test_key_123');
    }) as any);

    const code = await cmdLogin();
    expect(code).toBe(0);

    const cfg = loadConfig();
    expect(cfg.apiKey).toBe('cmdop_live_test_key_123');
  });

  it('returns 1 when API key prompt is cancelled', async () => {
    promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve(Symbol('cancel'));
    }) as any);

    const code = await cmdLogin();
    expect(code).toBe(1);
  });

  it('shows masked key when config already exists', async () => {
    saveConfig({ apiKey: 'cmdop_live_existing_key_9999', recentHosts: [] });

    const infoSpy = spyOn(consola, 'info');
    promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      return Promise.resolve('cmdop_live_new_key_1234');
    }) as any);

    await cmdLogin();

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('...9999'));
    infoSpy.mockRestore();
  });

  it('returns 1 on connection failure when user declines retry', async () => {
    mockHealthCheck.mockImplementation(() => Promise.reject(new Error('UNAVAILABLE')));

    let callIdx = 0;
    promptSpy = spyOn(consola, 'prompt').mockImplementation((() => {
      callIdx++;
      if (callIdx === 1) return Promise.resolve('cmdop_live_key_1234567890');
      if (callIdx === 2) return Promise.resolve(false); // decline retry
      return Promise.resolve('');
    }) as any);

    const code = await cmdLogin();
    expect(code).toBe(1);
  });
});
