import type { ChannelProtocol, HandlerResult, LoggerProtocol } from './types.js';
import type { OutgoingMessage, IncomingMessage } from '../models/message.js';
import type { PermissionLevel } from '../models/user.js';
import type { PermissionManager } from './permission-manager.js';
import type { MessageDispatcher } from './dispatcher.js';
import { parseCommand } from '../models/command.js';
import { BotError, CommandNotFoundError } from '../errors.js';

export abstract class BaseChannel implements ChannelProtocol {
  protected constructor(
    public readonly id: string,
    public readonly name: string,
    protected readonly permissions: PermissionManager,
    protected readonly dispatcher: MessageDispatcher,
    protected readonly logger: LoggerProtocol,
  ) {}

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract send(userId: string, message: OutgoingMessage): Promise<void>;
  abstract onMessage(handler: (msg: IncomingMessage) => Promise<void>): void;

  /**
   * Process an incoming message: parse command → check permission → dispatch → send result.
   * Plain text (non-command) is routed to the agent handler automatically.
   * Channels call this from their platform event handler.
   */
  protected async processMessage(msg: IncomingMessage): Promise<void> {
    const parsed = parseCommand(msg.text);

    // Non-command text → route to agent as chat message
    const ctx = parsed
      ? {
          userId: msg.userId,
          command: parsed.name,
          args: parsed.args,
          channelId: msg.channelId,
          message: msg,
        } as const
      : {
          userId: msg.userId,
          command: 'agent',
          args: [msg.text],
          channelId: msg.channelId,
          message: msg,
        } as const;

    let result: HandlerResult;
    try {
      result = await this.dispatcher.dispatch(ctx);
    } catch (err) {
      const botErr = err instanceof BotError ? err : new BotError('Unexpected error', { cause: err instanceof Error ? err : undefined });
      result = { ok: false, error: botErr };
    }

    if (result.ok) {
      await this.send(msg.userId, result.value);
    } else {
      await this.send(msg.userId, {
        type: 'error',
        message: this.formatErrorMessage(result.error),
      });
    }
  }

  private formatErrorMessage(error: BotError): string {
    if (error instanceof CommandNotFoundError) {
      return `Unknown command. Type /help for available commands.`;
    }
    return error.message;
  }

  protected logEvent(event: string, meta: Record<string, unknown> = {}): void {
    this.logger.info(`[${this.name}] ${event}`, { channel: this.id, ...meta });
  }
}
