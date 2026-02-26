import { describe, it, expect, vi } from 'vitest';
import { SlackStream } from '../../src/streaming/slack-stream.js';
import type { WebClient } from '@slack/web-api';

function makeMockClient(ts = '1234567890.123456') {
  const startStream = vi.fn().mockResolvedValue({ ts, ok: true });
  const appendStream = vi.fn().mockResolvedValue({ ok: true });
  const stopStream = vi.fn().mockResolvedValue({ ok: true });

  const client = {
    chat: { startStream, appendStream, stopStream },
  } as unknown as WebClient;

  return { client, startStream, appendStream, stopStream };
}

describe('SlackStream', () => {
  describe('start()', () => {
    it('calls chat.startStream with channel', async () => {
      const { client, startStream } = makeMockClient();
      await SlackStream.start(client, 'C12345');
      expect(startStream).toHaveBeenCalledWith({ channel: 'C12345' });
    });

    it('includes thread_ts when provided', async () => {
      const { client, startStream } = makeMockClient();
      await SlackStream.start(client, 'C12345', '1234.5678');
      expect(startStream).toHaveBeenCalledWith({ channel: 'C12345', thread_ts: '1234.5678' });
    });

    it('throws if startStream returns no ts', async () => {
      const client = {
        chat: { startStream: vi.fn().mockResolvedValue({ ok: true }) },
      } as unknown as WebClient;
      await expect(SlackStream.start(client, 'C12345')).rejects.toThrow('ts');
    });

    it('exposes messageTs', async () => {
      const { client } = makeMockClient('ts-abc');
      const stream = await SlackStream.start(client, 'C12345');
      expect(stream.messageTs).toBe('ts-abc');
    });
  });

  describe('append()', () => {
    it('calls chat.appendStream with text and ts', async () => {
      const { client, appendStream } = makeMockClient('ts-xyz');
      const stream = await SlackStream.start(client, 'C12345');
      await stream.append('hello token');
      expect(appendStream).toHaveBeenCalledWith({
        channel: 'C12345',
        ts: 'ts-xyz',
        markdown_text: 'hello token',
      });
    });

    it('does nothing after finish()', async () => {
      const { client, appendStream } = makeMockClient();
      const stream = await SlackStream.start(client, 'C12345');
      await stream.finish();
      await stream.append('ignored');
      expect(appendStream).not.toHaveBeenCalled();
    });
  });

  describe('finish()', () => {
    it('calls chat.stopStream with channel and ts', async () => {
      const { client, stopStream } = makeMockClient('ts-stop');
      const stream = await SlackStream.start(client, 'C12345');
      await stream.finish();
      expect(stopStream).toHaveBeenCalledWith({
        channel: 'C12345',
        ts: 'ts-stop',
      });
    });

    it('is idempotent — second call is a no-op', async () => {
      const { client, stopStream } = makeMockClient();
      const stream = await SlackStream.start(client, 'C12345');
      await stream.finish();
      await stream.finish();
      expect(stopStream).toHaveBeenCalledTimes(1);
    });

    it('sets isFinished to true', async () => {
      const { client } = makeMockClient();
      const stream = await SlackStream.start(client, 'C12345');
      expect(stream.isFinished).toBe(false);
      await stream.finish();
      expect(stream.isFinished).toBe(true);
    });
  });
});
