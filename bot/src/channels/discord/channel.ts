import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';
import { BaseChannel } from '../../core/base-channel.js';
import { DiscordFormatter } from './formatter.js';
import { DISCORD_COMMANDS } from './commands.js';
import type { OutgoingMessage, IncomingMessage } from '../../models/message.js';
import type { PermissionManager } from '../../core/permission-manager.js';
import type { MessageDispatcher } from '../../core/dispatcher.js';
import type { LoggerProtocol } from '../../core/types.js';
import { DiscordError } from '../../errors.js';

export interface DiscordChannelOptions {
  /** Bot token from Discord Developer Portal */
  token: string;
  /** Your Discord application/client ID */
  clientId: string;
  /** Guild ID for guild-scoped command registration (instant). Omit for global commands (up to 1h). */
  guildId?: string;
  /** User IDs (string) that get ADMIN permission automatically */
  adminUsers?: string[];
  /** Max characters before truncating outgoing messages. Default: 1900 */
  maxMessageLength?: number;
}

export class DiscordChannel extends BaseChannel {
  private client: Client | null = null;
  private readonly token: string;
  private readonly clientId: string;
  private readonly guildId: string | undefined;
  private readonly formatter: DiscordFormatter;
  private readonly maxLength: number;
  private messageHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];

  constructor(
    options: DiscordChannelOptions,
    permissions: PermissionManager,
    dispatcher: MessageDispatcher,
    logger: LoggerProtocol,
  ) {
    super('discord', 'Discord', permissions, dispatcher, logger);
    this.token = options.token;
    this.clientId = options.clientId;
    this.guildId = options.guildId;
    this.formatter = new DiscordFormatter();
    this.maxLength = options.maxMessageLength ?? 1900;
  }

  async start(): Promise<void> {
    // Register slash commands via REST before connecting
    await this.registerSlashCommands();

    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    client.on(Events.InteractionCreate, (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;
      void this.handleInteraction(interaction);
    });

    client.on(Events.Error, (err) => {
      this.logger.error('Discord client error', {
        channel: this.id,
        err: err.message,
      });
    });

    client.on(Events.Warn, (msg) => {
      this.logger.warn('Discord client warning', { channel: this.id, msg });
    });

    // Rate limit monitoring via REST debug events (not a gateway event)
    client.rest.on('rateLimited', (info) => {
      this.logger.warn('Discord rate limited', {
        channel: this.id,
        route: info.route,
        retryAfter: info.retryAfter,
      });
    });

    this.client = client;

    await client.login(this.token);
    this.logEvent('started (gateway)');
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.messageHandlers = [];
    this.logEvent('stopped');
  }

  async send(userId: string, message: OutgoingMessage): Promise<void> {
    if (!this.client) throw new DiscordError('Client not started');

    try {
      const user = await this.client.users.fetch(userId);
      const dm = await user.createDM();

      switch (message.type) {
        case 'text': {
          const text = this.truncate(this.formatter.formatText(message.text));
          await dm.send(text);
          break;
        }
        case 'code': {
          const code = this.formatter.formatCode(message.code, message.language);
          await dm.send(code);
          break;
        }
        case 'error': {
          const errText = this.formatter.formatError(
            Object.assign(new Error(message.message), {
              code: 'BOT_ERROR',
              context: {},
              toLog: () => ({}),
            }),
          );
          await dm.send(errText);
          break;
        }
      }
    } catch (err) {
      throw new DiscordError(
        `Failed to send DM to ${userId}`,
        err instanceof Error ? err : undefined,
      );
    }
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  // ─── Slash command handler ────────────────────────────────────────────────

  private async handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    // Defer reply immediately — operations may take >3 seconds
    await interaction.deferReply();

    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    const channelId = interaction.channelId ?? interaction.guildId ?? userId;

    // Build the text representation that processMessage expects
    const text = this.buildCommandText(interaction);

    const msg: IncomingMessage = {
      id: interaction.id,
      userId,
      channelId,
      text,
      timestamp: new Date(),
      attachments: [],
    };

    // Notify any external onMessage handlers
    for (const h of this.messageHandlers) await h(msg);

    // Dispatch via base class, but we need to send the reply via editReply
    // Override: call dispatcher directly and edit the deferred reply
    try {
      const parsed = { name: commandName, args: this.extractArgs(interaction) };
      const ctx = {
        userId,
        command: parsed.name,
        args: parsed.args,
        channelId,
        message: msg,
      } as const;

      const result = await this.dispatcher.dispatch(ctx);

      if (result.ok) {
        const reply = this.outgoingToString(result.value);
        await interaction.editReply(this.truncate(reply));
      } else {
        const errText = this.formatter.formatError(result.error);
        await interaction.editReply(errText);
      }
    } catch (err) {
      this.logger.error('Discord interaction error', {
        commandName,
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
      await interaction.editReply('❌ Something went wrong. Please try again.').catch(() => {
        // ignore if interaction already expired
      });
    }
  }

  private buildCommandText(interaction: ChatInputCommandInteraction): string {
    const name = interaction.commandName;
    const command = interaction.options.getString('command');
    const prompt = interaction.options.getString('prompt');
    const path = interaction.options.getString('path');
    const machine = interaction.options.getString('machine');

    const parts = [`/${name}`];
    if (command) parts.push(command);
    if (prompt) parts.push(prompt);
    if (path) parts.push(path);
    if (machine) parts.push(`--machine=${machine}`);
    return parts.join(' ');
  }

  private extractArgs(interaction: ChatInputCommandInteraction): string[] {
    const args: string[] = [];
    const command = interaction.options.getString('command');
    const prompt = interaction.options.getString('prompt');
    const path = interaction.options.getString('path');
    const machine = interaction.options.getString('machine');

    if (command) args.push(...command.split(/\s+/).filter(Boolean));
    if (prompt) args.push(prompt);
    if (path) args.push(path);
    if (machine) args.push(`--machine=${machine}`);
    return args;
  }

  private outgoingToString(msg: OutgoingMessage): string {
    switch (msg.type) {
      case 'text':
        return this.formatter.formatText(msg.text);
      case 'code':
        return this.formatter.formatCode(msg.code, msg.language);
      case 'error':
        return `❌ ${msg.message}`;
    }
  }

  private truncate(text: string): string {
    if (text.length <= this.maxLength) return text;
    return text.slice(0, this.maxLength - 20) + '\n...(truncated)';
  }

  // ─── Slash command registration ───────────────────────────────────────────

  private async registerSlashCommands(): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(this.token);

    try {
      if (this.guildId) {
        await rest.put(Routes.applicationGuildCommands(this.clientId, this.guildId), {
          body: DISCORD_COMMANDS,
        });
        this.logEvent(`slash commands registered (guild: ${this.guildId})`);
      } else {
        await rest.put(Routes.applicationCommands(this.clientId), {
          body: DISCORD_COMMANDS,
        });
        this.logEvent('slash commands registered (global)');
      }
    } catch (err) {
      throw new DiscordError(
        'Failed to register slash commands',
        err instanceof Error ? err : undefined,
      );
    }
  }
}
