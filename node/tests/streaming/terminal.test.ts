import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalStream } from '../../src/streaming/terminal';
import { StreamState } from '../../src/streaming/base';
import type { TerminalStreamingServiceClient } from '../../src/proto/generated/service';

function createMockClient(): TerminalStreamingServiceClient {
  return {
    sendInput: vi.fn().mockResolvedValue({ success: true, error: '' }),
    sendResize: vi.fn().mockResolvedValue({ success: true, error: '' }),
    sendSignal: vi.fn().mockResolvedValue({ success: true, error: '' }),
    getOutput: vi.fn().mockResolvedValue({ data: Buffer.alloc(0), totalBytes: 0, hasMore: false }),
  } as unknown as TerminalStreamingServiceClient;
}

describe('TerminalStream', () => {
  let client: TerminalStreamingServiceClient;
  let stream: TerminalStream;

  beforeEach(() => {
    vi.useFakeTimers();
    client = createMockClient();
    stream = new TerminalStream(client, 'sess-123', {
      pollIntervalMs: 50,
      idleThreshold: 3,
      idlePollIntervalMs: 200,
    });
  });

  afterEach(async () => {
    await stream.close();
    vi.useRealTimers();
  });

  // ──────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────

  it('starts in IDLE state', () => {
    expect(stream.state).toBe(StreamState.IDLE);
  });

  it('transitions through states on connect()', async () => {
    const states: StreamState[] = [];
    stream.on((e) => {
      if (e.type === 'status') states.push(stream.state);
    });

    const p = stream.connect();
    expect(stream.state).toBe(StreamState.CONNECTED);

    await stream.close();
    await p;

    expect(states).toContain(StreamState.CONNECTING);
    expect(states).toContain(StreamState.REGISTERING);
    expect(states).toContain(StreamState.CONNECTED);
  });

  it('throws if connect() is called twice', () => {
    stream.connect();
    expect(() => stream.connect()).toThrow('already started');
  });

  it('resolves connect() promise when close() is called', async () => {
    const p = stream.connect();
    await stream.close();
    await expect(p).resolves.toBeUndefined();
  });

  it('close() is idempotent', async () => {
    stream.connect();
    await stream.close();
    await stream.close(); // should not throw
    expect(stream.state).toBe(StreamState.CLOSED);
  });

  // ──────────────────────────────────────────────────────────────────
  // Input methods
  // ──────────────────────────────────────────────────────────────────

  it('sendInput sends correct data', async () => {
    stream.connect();
    await stream.sendInput('hello\n');

    expect(client.sendInput).toHaveBeenCalledWith({
      sessionId: 'sess-123',
      data: Buffer.from('hello\n'),
    });
  });

  it('sendInput accepts Buffer', async () => {
    stream.connect();
    const buf = Buffer.from([0x68, 0x69]);
    await stream.sendInput(buf);

    expect(client.sendInput).toHaveBeenCalledWith({
      sessionId: 'sess-123',
      data: buf,
    });
  });

  it('sendResize sends correct cols/rows', async () => {
    stream.connect();
    await stream.sendResize(120, 40);

    expect(client.sendResize).toHaveBeenCalledWith({
      sessionId: 'sess-123',
      cols: 120,
      rows: 40,
    });
  });

  it('sendSignal sends correct signal number', async () => {
    stream.connect();
    await stream.sendSignal('SIGINT');

    expect(client.sendSignal).toHaveBeenCalledWith({
      sessionId: 'sess-123',
      signal: 2,
    });
  });

  it('sendSignal accepts numeric signal', async () => {
    stream.connect();
    await stream.sendSignal(9);

    expect(client.sendSignal).toHaveBeenCalledWith({
      sessionId: 'sess-123',
      signal: 9,
    });
  });

  it('sendInput throws if stream is not connected', async () => {
    await expect(stream.sendInput('hi')).rejects.toThrow('not connected');
  });

  it('sendInput updates bytesSent metric', async () => {
    stream.connect();
    await stream.sendInput('hello');
    expect(stream.metrics.bytesSent).toBe(5);
  });

  // ──────────────────────────────────────────────────────────────────
  // Output polling
  // ──────────────────────────────────────────────────────────────────

  it('emits output events when data is available', async () => {
    const chunks: Buffer[] = [];
    stream.on((e) => {
      if (e.type === 'output') chunks.push(e.data);
    });

    vi.mocked(client.getOutput)
      .mockResolvedValueOnce({ data: Buffer.from('hello'), totalBytes: 5, hasMore: false })
      .mockResolvedValue({ data: Buffer.alloc(0), totalBytes: 5, hasMore: false });

    const p = stream.connect();
    // Advance just enough to fire the first poll and await its microtasks
    await vi.advanceTimersByTimeAsync(60);
    await stream.close();
    await p;

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toEqual(Buffer.from('hello'));
  });

  it('advances offset after receiving output', async () => {
    vi.mocked(client.getOutput)
      .mockResolvedValueOnce({ data: Buffer.from('abc'), totalBytes: 3, hasMore: false })
      .mockResolvedValue({ data: Buffer.alloc(0), totalBytes: 3, hasMore: false });

    const p = stream.connect();
    await vi.advanceTimersByTimeAsync(120);
    await stream.close();
    await p;

    // Second call should have offset = 3
    expect(client.getOutput).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess-123', offset: 3 })
    );
  });

  it('updates bytesReceived metric', async () => {
    vi.mocked(client.getOutput)
      .mockResolvedValueOnce({ data: Buffer.from('abcde'), totalBytes: 5, hasMore: false })
      .mockResolvedValue({ data: Buffer.alloc(0), totalBytes: 5, hasMore: false });

    const p = stream.connect();
    await vi.advanceTimersByTimeAsync(60);
    await stream.close();
    await p;

    expect(stream.metrics.bytesReceived).toBe(5);
  });

  it('emits error event on poll failure without stopping stream', async () => {
    const errors: Error[] = [];
    stream.on((e) => {
      if (e.type === 'error') errors.push(e.error);
    });

    vi.mocked(client.getOutput)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ data: Buffer.alloc(0), totalBytes: 0, hasMore: false });

    const p = stream.connect();
    await vi.advanceTimersByTimeAsync(60);

    expect(errors.length).toBeGreaterThan(0);
    expect(stream.state).toBe(StreamState.CONNECTED); // still connected

    await stream.close();
    await p;
  });

  // ──────────────────────────────────────────────────────────────────
  // Event listener management
  // ──────────────────────────────────────────────────────────────────

  it('on() / off() register and remove listeners', async () => {
    const events: string[] = [];
    const cb = (e: { type: string }) => events.push(e.type);

    stream.on(cb);
    const p = stream.connect();
    stream.off(cb);

    vi.mocked(client.getOutput).mockResolvedValue({
      data: Buffer.from('x'),
      totalBytes: 1,
      hasMore: false,
    });

    await vi.advanceTimersByTimeAsync(60);
    await stream.close();
    await p;

    // After off(), no more output events should arrive
    expect(events.filter((t) => t === 'output')).toHaveLength(0);
  });

  it('on() returns this for chaining', () => {
    const result = stream.on(() => {});
    expect(result).toBe(stream);
  });

  // ──────────────────────────────────────────────────────────────────
  // Metrics
  // ──────────────────────────────────────────────────────────────────

  it('metrics returns a snapshot (not live reference)', async () => {
    stream.connect();
    const m1 = stream.metrics;
    await stream.sendInput('x');
    const m2 = stream.metrics;
    expect(m1.bytesSent).toBe(0);
    expect(m2.bytesSent).toBe(1);
    await stream.close();
  });

  // ──────────────────────────────────────────────────────────────────
  // Symbol.asyncDispose
  // ──────────────────────────────────────────────────────────────────

  it('Symbol.asyncDispose closes the stream', async () => {
    stream.connect();
    await stream[Symbol.asyncDispose]();
    expect(stream.state).toBe(StreamState.CLOSED);
  });
});
