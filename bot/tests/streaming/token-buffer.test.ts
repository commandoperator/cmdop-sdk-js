import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBuffer } from '../../src/streaming/token-buffer.js';

describe('TokenBuffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not flush immediately on append', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    buf.append('hello');
    expect(flush).not.toHaveBeenCalled();
  });

  it('flushes after debounce interval', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    buf.append('hello ');
    buf.append('world');
    await vi.runAllTimersAsync();
    expect(flush).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledWith('hello world');
  });

  it('does not double-schedule for rapid appends', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    buf.append('a');
    buf.append('b');
    buf.append('c');
    await vi.runAllTimersAsync();
    expect(flush).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledWith('abc');
  });

  it('drain flushes immediately without waiting for timer', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    buf.append('final');
    await buf.drain();
    expect(flush).toHaveBeenCalledWith('final');
  });

  it('drain cancels pending timer', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    buf.append('data');
    await buf.drain(); // flushes immediately
    await vi.runAllTimersAsync(); // timer would have fired here
    expect(flush).toHaveBeenCalledOnce(); // only one flush
  });

  it('drain on empty buffer does not call flush', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    await buf.drain();
    expect(flush).not.toHaveBeenCalled();
  });

  it('ignores appends after drain', async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const buf = new TokenBuffer(flush, 500);
    await buf.drain();
    buf.append('late');
    await vi.runAllTimersAsync();
    expect(flush).not.toHaveBeenCalled(); // stopped
  });

  it('isStopped is false before drain', () => {
    const buf = new TokenBuffer(vi.fn(), 500);
    expect(buf.isStopped).toBe(false);
  });

  it('isStopped is true after drain', async () => {
    const buf = new TokenBuffer(vi.fn().mockResolvedValue(undefined), 500);
    await buf.drain();
    expect(buf.isStopped).toBe(true);
  });

  it('bufferedLength tracks appended content', () => {
    const buf = new TokenBuffer(vi.fn(), 500);
    buf.append('hello');
    expect(buf.bufferedLength).toBe(5);
    buf.append('!');
    expect(buf.bufferedLength).toBe(6);
  });
});
