import { BaseChannel } from '../../core/base-channel.js';
import type { OutgoingMessage, IncomingMessage } from '../../models/message.js';
import type { PermissionManager } from '../../core/permission-manager.js';
import type { MessageDispatcher } from '../../core/dispatcher.js';
import type { LoggerProtocol } from '../../core/types.js';

export interface DemoChannelOptions {
  /** Called for every outgoing message (default: JSON to stdout) */
  onOutput?: (text: string, message: OutgoingMessage) => void;
}

/**
 * DemoChannel — stdio-based channel for local testing and CLI usage.
 * No real platform; messages are injected programmatically via injectMessage().
 */
export class DemoChannel extends BaseChannel {
  private messageHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];
  private readonly onOutput: (text: string, message: OutgoingMessage) => void;

  constructor(
    permissions: PermissionManager,
    dispatcher: MessageDispatcher,
    logger: LoggerProtocol,
    options: DemoChannelOptions = {},
  ) {
    super('demo', 'Demo', permissions, dispatcher, logger);
    this.onOutput = options.onOutput ?? ((text) => process.stdout.write(text + '\n'));
  }

  async start(): Promise<void> {
    this.logEvent('started');
  }

  async stop(): Promise<void> {
    this.messageHandlers = [];
    this.logEvent('stopped');
  }

  send(_userId: string, message: OutgoingMessage): Promise<void> {
    const text = formatOutgoing(message);
    this.onOutput(text, message);
    return Promise.resolve();
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Inject a message as if it came from a real platform user.
   * Primarily used in tests and CLI demos.
   */
  async injectMessage(input: { userId?: string; text: string }): Promise<void> {
    const msg: IncomingMessage = {
      id: `demo-${Date.now()}`,
      userId: input.userId ?? 'demo-user',
      channelId: this.id,
      text: input.text,
      timestamp: new Date(),
      attachments: [],
    };

    // Call registered onMessage handlers (set by hub)
    for (const handler of this.messageHandlers) {
      await handler(msg);
    }
    // Also process through dispatcher directly
    await this.processMessage(msg);
  }
}

function formatOutgoing(message: OutgoingMessage): string {
  switch (message.type) {
    case 'text':
      return message.text;
    case 'code':
      return `\`\`\`${message.language ?? ''}\n${message.code}\n\`\`\``;
    case 'error':
      return `❌ ${message.message}${message.hint ? `\n💡 ${message.hint}` : ''}`;
  }
}
