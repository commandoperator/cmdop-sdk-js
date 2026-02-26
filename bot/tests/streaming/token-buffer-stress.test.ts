/**
 * TokenBuffer stress tests:
 * - 1000 rapid tokens → single flush batch
 * - Concurrent append + drain race
 * - drain() during active debounce window
 * - isStopped prevents further appends
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBuffer } from '../../src/streaming/token-buffer.js';

describe('TokenBuffer stress', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('1000 rapid appends produce a single flush with all content', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 200);

    for (let i = 0; i < 1000; i++) {
      buf.append(`token${i} `);
    }

    // Only one timer should be scheduled (idempotent scheduling)
    await vi.runAllTimersAsync();

    expect(flush).toHaveBeenCalledTimes(1);
    const flushed = flush.mock.calls[0]![0] as string;
    expect(flushed).toContain('token0 ');
    expect(flushed).toContain('token999 ');
    expect(flushed.length).toBeGreaterThan(8000); // "token0 "–"token999 " total ≈ 8890 chars
  });

  it('drain() before timer fires flushes immediately', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);

    buf.append('hello ');
    buf.append('world');

    // Timer hasn't fired yet
    expect(flush).not.toHaveBeenCalled();

    await buf.drain();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush.mock.calls[0]![0]).toBe('hello world');
  });

  it('drain() after timer already fired does not double-flush', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 100);

    buf.append('data');
    await vi.runAllTimersAsync();
    expect(flush).toHaveBeenCalledTimes(1);

    // drain on already-flushed empty buffer — should not flush again
    await buf.drain();
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('append after drain() is silently ignored', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 100);

    buf.append('before');
    await buf.drain();
    buf.append('after drain — should be ignored');

    await vi.runAllTimersAsync();
    // flush called once for "before", never again
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush.mock.calls[0]![0]).toBe('before');
  });

  it('isStopped is false before drain, true after', async () => {
    const buf = new TokenBuffer(vi.fn().mockResolvedValue(undefined), 100);
    expect(buf.isStopped).toBe(false);
    await buf.drain();
    expect(buf.isStopped).toBe(true);
  });

  it('bufferedLength tracks accumulated content', () => {
    const buf = new TokenBuffer(vi.fn().mockResolvedValue(undefined), 500);
    expect(buf.bufferedLength).toBe(0);
    buf.append('hello');
    expect(buf.bufferedLength).toBe(5);
    buf.append(' world');
    expect(buf.bufferedLength).toBe(11);
  });

  it('multiple debounce windows: each burst produces one flush', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 300);

    // First burst
    buf.append('burst1-a');
    buf.append('burst1-b');
    await vi.runAllTimersAsync();

    // Second burst
    buf.append('burst2-a');
    buf.append('burst2-b');
    await vi.runAllTimersAsync();

    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush.mock.calls[0]![0]).toBe('burst1-aburst1-b');
    expect(flush.mock.calls[1]![0]).toBe('burst2-aburst2-b');
  });

  it('drain() on empty buffer does not call flush', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 100);
    await buf.drain();
    expect(flush).not.toHaveBeenCalled();
  });
});
