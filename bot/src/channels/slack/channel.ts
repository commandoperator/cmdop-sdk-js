import { App, Assistant } from '@slack/bolt';
import { BaseChannel } from '../../core/base-channel.js';
import { SlackFormatter } from './formatter.js';
import type { OutgoingMessage, IncomingMessage } from '../../models/message.js';
import type { PermissionManager } from '../../core/permission-manager.js';
import type { MessageDispatcher } from '../../core/dispatcher.js';
import type { LoggerProtocol } from '../../core/types.js';
import { SlackError } from '../../errors.js';

export interface SlackChannelOptions {
  /** Bot OAuth token (xoxb-...) */
  token: string;
  /** App-level token for Socket Mode (xapp-...) */
  appToken: string;
  /** User IDs that get ADMIN permission automatically */
  adminUsers?: string[];
  /** Max characters before truncating outgoing messages. Default: 2800 */
  maxMessageLength?: number;
}

export class SlackChannel extends BaseChannel {
  private app: App | null = null;
  private readonly token: string;
  private readonly appToken: string;
  private readonly formatter: SlackFormatter;
  private readonly maxLength: number;
  private messageHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];

  constructor(
    options: SlackChannelOptions,
    permissions: PermissionManager,
    dispatcher: MessageDispatcher,
    logger: LoggerProtocol,
  ) {
    super('slack', 'Slack', permissions, dispatcher, logger);
    this.token = options.token;
    this.appToken = options.appToken;
    this.formatter = new SlackFormatter();
    this.maxLength = options.maxMessageLength ?? 2800;
  }

  async start(): Promise<void> {
    const app = new App({
      token: this.token,
      appToken: this.appToken,
      socketMode: true,
    });

    // ─── Message handler — slash-style commands in DMs / channels ──────────
    app.message(async ({ message, say }) => {
      // message can be a subtype; we only handle plain messages with text
      if (message.subtype !== undefined) return;
      const plainMsg = message as { text?: string; user?: string; ts: string; channel: string };
      if (!plainMsg.text || !plainMsg.user) return;

      const incomingMsg: IncomingMessage = {
        id: plainMsg.ts,
        userId: plainMsg.user,
        channelId: plainMsg.channel,
        text: plainMsg.text,
        timestamp: new Date(),
        attachments: [],
      };

      for (const h of this.messageHandlers) await h(incomingMsg);

      await this.processMessageWithSay(incomingMsg, async (text) => {
        await say(text);
      });
    });

    // ─── Assistant integration ─────────────────────────────────────────────
    const assistant = new Assistant({
      threadStarted: async ({ say, setTitle, setSuggestedPrompts }) => {
        await setTitle('CMDOP Assistant');
        await setSuggestedPrompts({
          prompts: [
            { title: 'Run a command', message: '/exec ls -la' },
            { title: 'List files', message: '/files /' },
            { title: 'Get help', message: '/help' },
          ],
        });
        await say('Hello! Use `/exec`, `/agent`, `/files`, or `/help`.');
      },

      threadContextChanged: async ({ saveThreadContext }) => {
        await saveThreadContext();
      },

      userMessage: async ({ message, say }) => {
        const plainMsg = message as { text?: string; user?: string; ts: string; channel: string; thread_ts?: string };
        if (!plainMsg.text || !plainMsg.user) return;

        const incomingMsg: IncomingMessage = {
          id: plainMsg.ts,
          userId: plainMsg.user,
          channelId: plainMsg.channel,
          text: plainMsg.text,
          timestamp: new Date(),
          attachments: [],
        };

        await this.processMessageWithSay(incomingMsg, async (text) => {
          await say(text);
        });
      },
    });

    app.assistant(assistant);

    // ─── Global error handler ──────────────────────────────────────────────
    app.error(async (err) => {
      this.logger.error('Slack app error', {
        channel: this.id,
        err: err.message,
        code: (err as { code?: string }).code,
      });
    });

    this.app = app;

    // start() returns when Socket Mode connection is established
    await app.start();
    this.logEvent('started (socket mode)');
  }

  async stop(): Promise<void> {
    if (this.app) {
      await this.app.stop();
      this.app = null;
    }
    this.messageHandlers = [];
    this.logEvent('stopped');
  }

  async send(userId: string, message: OutgoingMessage): Promise<void> {
    if (!this.app) throw new SlackError('App not started');

    try {
      const text = this.buildText(message);
      await this.app.client.chat.postMessage({
        channel: userId,
        text: this.truncate(text),
      });
    } catch (err) {
      throw new SlackError(
        `Failed to send DM to ${userId}`,
        err instanceof Error ? err : undefined,
      );
    }
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async processMessageWithSay(
    msg: IncomingMessage,
    say: (text: string) => Promise<void>,
  ): Promise<void> {
    const { parseCommand } = await import('../../models/command.js');
    const parsed = parseCommand(msg.text);
    if (!parsed) return;

    const ctx = {
      userId: msg.userId,
      command: parsed.name,
      args: parsed.args,
      channelId: msg.channelId,
      message: msg,
    } as const;

    try {
      const result = await this.dispatcher.dispatch(ctx);

      if (result.ok) {
        await say(this.truncate(this.buildText(result.value)));
      } else {
        await say(this.formatter.formatError(result.error));
      }
    } catch (err) {
      this.logger.error('Slack message processing error', {
        userId: msg.userId,
        err: err instanceof Error ? err.message : String(err),
      });
      await say(':x: Something went wrong. Please try again.');
    }
  }

  private buildText(message: OutgoingMessage): string {
    switch (message.type) {
      case 'text':
        return this.formatter.formatText(message.text);
      case 'code':
        return this.formatter.formatCode(message.code, message.language);
      case 'error':
        return `:x: ${message.message}`;
    }
  }

  private truncate(text: string): string {
    if (text.length <= this.maxLength) return text;
    return text.slice(0, this.maxLength - 20) + '\n…(truncated)';
  }
}
