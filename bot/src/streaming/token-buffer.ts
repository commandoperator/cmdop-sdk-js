/**
 * TokenBuffer — debounced flush for streaming tokens to rate-limited platforms.
 *
 * Telegram/Discord enforce ~1 message edit per second per chat.
 * Accumulate tokens and flush on a timer to avoid 429 errors.
 */

export class TokenBuffer {
  private buffer = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly flush: (text: string) => Promise<void>,
    private readonly debounceMs: number = 500,
  ) {}

  /**
   * Append a token. Schedules a flush if not already scheduled.
   * No-op after drain() is called.
   */
  append(token: string): void {
    if (this.stopped) return;
    this.buffer += token;
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timer !== null) return; // already scheduled
    this.timer = setTimeout(() => {
      this.timer = null;
      const text = this.buffer;
      this.buffer = '';
      if (text) {
        void this.flush(text).catch(() => {
          // Flush errors are intentionally swallowed here —
          // the caller should handle platform-level errors at a higher level.
        });
      }
    }, this.debounceMs);
  }

  /**
   * Cancel pending timer, flush remaining content immediately, stop accepting tokens.
   * Always call this after the stream ends.
   */
  async drain(): Promise<void> {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer) {
      const text = this.buffer;
      this.buffer = '';
      await this.flush(text);
    }
  }

  get bufferedLength(): number {
    return this.buffer.length;
  }

  get isStopped(): boolean {
    return this.stopped;
  }
}
