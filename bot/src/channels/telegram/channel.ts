import { Bot, type Context } from 'grammy';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { BaseChannel } from '../../core/base-channel.js';
import { TelegramFormatter } from './formatter.js';
import type { OutgoingMessage, IncomingMessage } from '../../models/message.js';
import type { PermissionManager } from '../../core/permission-manager.js';
import type { MessageDispatcher } from '../../core/dispatcher.js';
import type { LoggerProtocol } from '../../core/types.js';
import { TelegramError } from '../../errors.js';

export interface TelegramChannelOptions {
  token: string;
  /** User IDs (numeric as string) that get ADMIN permission automatically */
  adminUsers?: string[];
  /** Max length before truncating outgoing messages. Default: 4000 */
  maxMessageLength?: number;
}

export class TelegramChannel extends BaseChannel {
  private bot: Bot | null = null;
  private readonly token: string;
  private readonly formatter: TelegramFormatter;
  private readonly maxLength: number;
  private messageHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];

  constructor(
    options: TelegramChannelOptions,
    permissions: PermissionManager,
    dispatcher: MessageDispatcher,
    logger: LoggerProtocol,
  ) {
    super('telegram', 'Telegram', permissions, dispatcher, logger);
    this.token = options.token;
    this.formatter = new TelegramFormatter();
    this.maxLength = options.maxMessageLength ?? 4000;
  }

  async start(): Promise<void> {
    const bot = new Bot(this.token);

    // Apply throttler — queues API calls to respect Telegram flood limits
    bot.api.config.use(apiThrottler());

    // Text message handler
    bot.on('message:text', async (ctx) => {
      const msg = this.normalizeContext(ctx);
      if (!msg) return;

      for (const h of this.messageHandlers) await h(msg);
      await this.processMessage(msg);
    });

    // Callback query handler (inline keyboard buttons)
    bot.on('callback_query:data', async (ctx) => {
      await ctx.answerCallbackQuery();
      const text = ctx.callbackQuery.data;
      const userId = String(ctx.from.id);
      const channelId = String(ctx.chat?.id ?? ctx.from.id);
      const msg: IncomingMessage = {
        id: `cbq-${ctx.callbackQuery.id}`,
        userId,
        channelId,
        text,
        timestamp: new Date(),
        attachments: [],
      };
      await this.processMessage(msg);
    });

    // Global error handler — prevents crashes on handler errors
    bot.catch((err) => {
      this.logger.error('Telegram error', {
        channel: this.id,
        err: err.error instanceof Error ? err.error.message : String(err.error),
      });
    });

    this.bot = bot;

    // Start long-polling in background (non-blocking)
    bot.start({
      onStart: () => this.logEvent('started (long-polling)'),
    }).catch((err: unknown) => {
      this.logger.error('Telegram bot start error', { err: String(err) });
    });
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.bot = null;
    }
    this.messageHandlers = [];
    this.logEvent('stopped');
  }

  async send(userId: string, message: OutgoingMessage): Promise<void> {
    if (!this.bot) throw new TelegramError('Bot not started');

    const chatId = Number(userId);
    if (Number.isNaN(chatId)) {
      this.logger.warn('Invalid Telegram userId for send', { userId });
      return;
    }

    try {
      switch (message.type) {
        case 'text': {
          const text = this.truncate(this.formatter.formatText(message.text));
          await this.bot.api.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
          break;
        }
        case 'code': {
          const code = this.formatter.formatCode(message.code, message.language);
          await this.bot.api.sendMessage(chatId, code, { parse_mode: 'MarkdownV2' });
          break;
        }
        case 'error': {
          const errText = this.formatter.formatError(
            Object.assign(new Error(message.message), { code: 'BOT_ERROR', context: {}, toLog: () => ({}) }),
          );
          await this.bot.api.sendMessage(chatId, errText, { parse_mode: 'MarkdownV2' });
          break;
        }
      }
    } catch (err) {
      throw new TelegramError(
        `Failed to send message to ${userId}`,
        err instanceof Error ? err : undefined,
      );
    }
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  private normalizeContext(ctx: Context): IncomingMessage | null {
    if (!ctx.message?.text || !ctx.from || !ctx.chat) return null;
    return {
      id: String(ctx.message.message_id),
      userId: String(ctx.from.id),
      channelId: String(ctx.chat.id),
      text: ctx.message.text,
      timestamp: new Date(ctx.message.date * 1000),
      attachments: [],
    };
  }

  private truncate(text: string): string {
    if (text.length <= this.maxLength) return text;
    return text.slice(0, this.maxLength - 20) + '\n\\.\\.\\. *\\(truncated\\)*';
  }
}
