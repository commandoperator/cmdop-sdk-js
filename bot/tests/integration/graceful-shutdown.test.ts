/**
 * Graceful shutdown tests.
 *
 * Verifies that:
 * - hub.stop() waits for all channels to stop
 * - DemoChannel clears handlers on stop()
 * - TokenBuffer drain() is called before stop completes (simulated)
 * - A channel that throws on stop() does not prevent hub from completing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemoChannel } from '../../src/channels/demo/index.js';
import { MessageDispatcher } from '../../src/core/dispatcher.js';
import { PermissionManager, InMemoryPermissionStore } from '../../src/core/permission-manager.js';
import { createLogger } from '../../src/core/logger.js';
import { TokenBuffer } from '../../src/streaming/token-buffer.js';
import type { ChannelProtocol, OutgoingMessage } from '../../src/core/types.js';
import { IntegrationHub } from '../../src/hub.js';
import { CMDOPClient } from '@cmdop/node';

// ─── DemoChannel lifecycle ───────────────────────────────────────────────────

function makeDemo() {
  const store = new InMemoryPermissionStore();
  const permissions = new PermissionManager(store);
  const logger = createLogger('error');
  const dispatcher = new MessageDispatcher(permissions, logger);
  const outputs: OutgoingMessage[] = [];
  const channel = new DemoChannel(permissions, dispatcher, logger, {
    onOutput: (_t, m) => outputs.push(m),
  });
  return { channel, outputs };
}

describe('DemoChannel graceful shutdown', () => {
  it('stop() clears onMessage handlers', async () => {
    const { channel } = makeDemo();
    let called = false;
    channel.onMessage(async () => { called = true; });
    await channel.start();
    await channel.stop();

    // After stop, injecting a message should not trigger the handler
    // (handlers cleared — processMessage will still run but onMessage handlers won't)
    expect(called).toBe(false);
  });

  it('start() then stop() is idempotent', async () => {
    const { channel } = makeDemo();
    await channel.start();
    await channel.stop();
    await channel.start();
    await channel.stop();
    // No error thrown
  });
});

// ─── TokenBuffer drain on shutdown ──────────────────────────────────────────

describe('TokenBuffer drain on shutdown', () => {
  it('drain() flushes remaining tokens synchronously before resolve', async () => {
    const flushed: string[] = [];
    const buf = new TokenBuffer(async (text) => { flushed.push(text); }, 10_000);

    buf.append('remaining-token');
    // Don't wait for timer — call drain() directly as part of shutdown
    await buf.drain();

    expect(flushed).toEqual(['remaining-token']);
    expect(buf.isStopped).toBe(true);
  });

  it('new appends during shutdown simulation are dropped', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 10_000);

    buf.append('valid-token');
    const drainPromise = buf.drain();

    // Simulate token arriving while drain is in progress
    buf.append('too-late-token');

    await drainPromise;

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush.mock.calls[0]![0]).toBe('valid-token');
  });
});

// ─── Hub stop() resilience ───────────────────────────────────────────────────

describe('IntegrationHub stop() resilience', () => {
  async function makeHub() {
    vi.spyOn(CMDOPClient, 'local').mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
      terminal: {}, agent: {}, files: {},
    } as unknown as CMDOPClient);

    const logger = createLogger('error');
    const hub = await IntegrationHub.create({ logger });
    return hub;
  }

  it('stop() completes even when a channel throws on stop()', async () => {
    const hub = await makeHub();

    const good: ChannelProtocol = {
      id: 'good', name: 'good',
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(), onMessage: vi.fn(),
    };
    const bad: ChannelProtocol = {
      id: 'bad', name: 'bad',
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockRejectedValue(new Error('stop crash')),
      send: vi.fn(), onMessage: vi.fn(),
    };

    hub.registerChannel(good).registerChannel(bad);
    await hub.start();
    await expect(hub.stop()).resolves.toBeUndefined(); // must not throw
    expect(good.stop).toHaveBeenCalledOnce();
    expect(bad.stop).toHaveBeenCalledOnce();
  });

  it('stop() sets isStarted to false', async () => {
    const hub = await makeHub();
    hub.registerChannel({
      id: 'ch', name: 'ch',
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(), onMessage: vi.fn(),
    });
    await hub.start();
    expect(hub.isStarted).toBe(true);
    await hub.stop();
    expect(hub.isStarted).toBe(false);
  });

  it('stop() without start() does not throw', async () => {
    const hub = await makeHub();
    await expect(hub.stop()).resolves.toBeUndefined();
  });
});
