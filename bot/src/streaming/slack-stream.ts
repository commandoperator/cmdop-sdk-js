import type { WebClient } from '@slack/web-api';

/**
 * Slack native streaming via chat.startStream / appendStream / stopStream.
 *
 * Unlike Telegram/Discord (which need TokenBuffer debouncing), Slack provides
 * first-class streaming primitives — no debounce required.
 *
 * The streaming protocol uses the message `ts` (timestamp) as the handle:
 *   1. startStream() → returns { ts, channel }
 *   2. appendStream({ channel, ts, markdown_text })
 *   3. stopStream({ channel, ts })
 *
 * Usage:
 *   const stream = await SlackStream.start(client, channel, threadTs);
 *   await stream.append('token...');
 *   await stream.finish();
 */
export class SlackStream {
  private stopped = false;

  private constructor(
    private readonly client: WebClient,
    private readonly channel: string,
    private readonly ts: string,
  ) {}

  /**
   * Start a new streaming message in the given channel/thread.
   */
  static async start(
    client: WebClient,
    channel: string,
    threadTs?: string,
  ): Promise<SlackStream> {
    const args: { channel: string; thread_ts?: string } = { channel };
    if (threadTs) args.thread_ts = threadTs;

    const res = await client.chat.startStream(args as Parameters<typeof client.chat.startStream>[0]);

    if (!res.ts) {
      throw new Error('Slack startStream did not return ts');
    }

    return new SlackStream(client, channel, res.ts);
  }

  /**
   * Append a token/chunk to the in-progress stream.
   * Silently ignores appends after finish().
   */
  async append(text: string): Promise<void> {
    if (this.stopped) return;
    await this.client.chat.appendStream({
      channel: this.channel,
      ts: this.ts,
      markdown_text: text,
    });
  }

  /**
   * Stop the stream and finalise the message.
   * Idempotent — safe to call multiple times.
   */
  async finish(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.client.chat.stopStream({
      channel: this.channel,
      ts: this.ts,
    });
  }

  get isFinished(): boolean {
    return this.stopped;
  }

  /** The Slack message ts that identifies this stream. */
  get messageTs(): string {
    return this.ts;
  }
}
