import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationHub } from '../../src/hub.js';
import { IdentityMap, InMemoryPermissionStore, PermissionManager } from '../../src/core/permission-manager.js';
import type { ChannelProtocol, LoggerProtocol, OutgoingMessage, IncomingMessage } from '../../src/core/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLogger(): LoggerProtocol {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeChannel(id: string, opts: { failStart?: boolean; failStop?: boolean } = {}): ChannelProtocol {
  return {
    id,
    name: id,
    start: opts.failStart
      ? vi.fn().mockRejectedValue(new Error(`${id} start failed`))
      : vi.fn().mockResolvedValue(undefined),
    stop: opts.failStop
      ? vi.fn().mockRejectedValue(new Error(`${id} stop failed`))
      : vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    onMessage: vi.fn(),
  };
}

/**
 * Build a minimal hub without a real CMDOPClient.
 * We access the private constructor via the static `create` path but mock
 * everything that would require a live connection.
 */
async function makeHub(options: Parameters<typeof IntegrationHub.create>[0] = {}) {
  // Patch CMDOPClient.local so it doesn't try to connect
  const { CMDOPClient } = await import('@cmdop/node');
  const spy = vi.spyOn(CMDOPClient, 'local').mockResolvedValue({
    close: vi.fn().mockResolvedValue(undefined),
    terminal: {},
    agent: {},
    files: {},
  } as unknown as InstanceType<typeof CMDOPClient>);

  const logger = makeLogger();
  const hub = await IntegrationHub.create({ ...options, logger });

  spy.mockRestore();
  return { hub, logger };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IntegrationHub — channel registration', () => {
  it('starts with no channels', async () => {
    const { hub } = await makeHub();
    expect(hub.channelCount).toBe(0);
    expect(hub.channelIds).toEqual([]);
  });

  it('registerChannel adds a channel', async () => {
    const { hub } = await makeHub();
    const ch = makeChannel('telegram');
    hub.registerChannel(ch);
    expect(hub.channelCount).toBe(1);
    expect(hub.channelIds).toContain('telegram');
  });

  it('getChannel returns registered channel', async () => {
    const { hub } = await makeHub();
    const ch = makeChannel('slack');
    hub.registerChannel(ch);
    expect(hub.getChannel('slack')).toBe(ch);
  });

  it('getChannel returns undefined for unknown id', async () => {
    const { hub } = await makeHub();
    expect(hub.getChannel('nope')).toBeUndefined();
  });

  it('registerChannel returns hub for chaining', async () => {
    const { hub } = await makeHub();
    const result = hub.registerChannel(makeChannel('a'));
    expect(result).toBe(hub);
  });
});

describe('IntegrationHub — start/stop lifecycle', () => {
  it('start() calls start on all channels', async () => {
    const { hub } = await makeHub();
    const ch1 = makeChannel('telegram');
    const ch2 = makeChannel('discord');
    hub.registerChannel(ch1).registerChannel(ch2);

    await hub.start();

    expect(ch1.start).toHaveBeenCalledOnce();
    expect(ch2.start).toHaveBeenCalledOnce();
  });

  it('start() is idempotent', async () => {
    const { hub } = await makeHub();
    const ch = makeChannel('telegram');
    hub.registerChannel(ch);

    await hub.start();
    await hub.start();

    expect(ch.start).toHaveBeenCalledTimes(1);
  });

  it('stop() calls stop on all channels', async () => {
    const { hub } = await makeHub();
    const ch1 = makeChannel('telegram');
    const ch2 = makeChannel('discord');
    hub.registerChannel(ch1).registerChannel(ch2);
    await hub.start();

    await hub.stop();

    expect(ch1.stop).toHaveBeenCalledOnce();
    expect(ch2.stop).toHaveBeenCalledOnce();
  });

  it('isStarted reflects lifecycle', async () => {
    const { hub } = await makeHub();
    hub.registerChannel(makeChannel('tg'));

    expect(hub.isStarted).toBe(false);
    await hub.start();
    expect(hub.isStarted).toBe(true);
    await hub.stop();
    expect(hub.isStarted).toBe(false);
  });
});

describe('IntegrationHub — isolated channel start mode', () => {
  it('a failing channel does not prevent others from starting', async () => {
    const { hub, logger } = await makeHub({ channelStartMode: 'isolated' });
    const good = makeChannel('discord');
    const bad = makeChannel('telegram', { failStart: true });
    hub.registerChannel(bad).registerChannel(good);

    await hub.start(); // must not throw

    expect(good.start).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      'Channel failed to start',
      expect.objectContaining({ channel: 'telegram' }),
    );
  });

  it('failing channel gets "failed" status', async () => {
    const { hub } = await makeHub({ channelStartMode: 'isolated' });
    hub.registerChannel(makeChannel('telegram', { failStart: true }));

    await hub.start();

    expect(hub.getChannelStatus('telegram')).toBe('failed');
    expect(hub.failedChannelIds).toContain('telegram');
  });

  it('successful channel gets "running" status', async () => {
    const { hub } = await makeHub();
    hub.registerChannel(makeChannel('slack'));

    await hub.start();

    expect(hub.getChannelStatus('slack')).toBe('running');
    expect(hub.runningChannelIds).toContain('slack');
  });
});

describe('IntegrationHub — strict channel start mode', () => {
  it('a failing channel causes start() to throw', async () => {
    const { hub } = await makeHub({ channelStartMode: 'strict' });
    hub.registerChannel(makeChannel('telegram', { failStart: true }));

    await expect(hub.start()).rejects.toThrow('telegram start failed');
  });
});

describe('IntegrationHub — stop resilience', () => {
  it('stop() continues even if one channel fails to stop', async () => {
    const { hub, logger } = await makeHub();
    const good = makeChannel('slack');
    const bad = makeChannel('discord', { failStop: true });
    hub.registerChannel(good).registerChannel(bad);
    await hub.start();

    await hub.stop(); // must not throw

    expect(good.stop).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      'Channel stop error',
      expect.anything(),
    );
  });
});

describe('IntegrationHub — linkIdentities', () => {
  it('grants cross-channel permissions after linking', async () => {
    const { hub } = await makeHub();

    // Grant EXECUTE to Telegram user
    await hub.permissions.setLevel('telegram:100', 'EXECUTE');

    // Link Telegram and Discord identities
    hub.linkIdentities('telegram', '100', 'discord', '200');

    // Discord user should now inherit EXECUTE
    expect(await hub.permissions.hasPermission('discord:200', 'EXECUTE')).toBe(true);
  });

  it('linkIdentities uses IdentityMap.platformId convention', async () => {
    const { hub } = await makeHub();
    hub.linkIdentities('slack', 'S1', 'telegram', 'T1');

    await hub.permissions.setLevel('slack:S1', 'FILES');
    expect(await hub.permissions.hasPermission('telegram:T1', 'FILES')).toBe(true);
  });
});
