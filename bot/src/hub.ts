import { CMDOPClient } from '@cmdop/node';
import { MessageDispatcher } from './core/dispatcher.js';
import { PermissionManager, InMemoryPermissionStore, IdentityMap } from './core/permission-manager.js';
import { createLogger } from './core/logger.js';
import { TerminalHandler } from './handlers/terminal.js';
import { AgentHandler } from './handlers/agent.js';
import { FilesHandler } from './handlers/files.js';
import { HelpHandler } from './handlers/help.js';
import type { ChannelProtocol, HandlerProtocol, LoggerProtocol, PermissionStoreProtocol } from './core/types.js';
import type { BotSettings } from './config.js';
import { loadSettings } from './config.js';

// Lazy channel imports — only imported when actually used, keeping platform deps optional
type TelegramChannelCtor = typeof import('./channels/telegram/channel.js').TelegramChannel;
type TelegramOptions = import('./channels/telegram/channel.js').TelegramChannelOptions;

type DiscordChannelCtor = typeof import('./channels/discord/channel.js').DiscordChannel;
type DiscordOptions = import('./channels/discord/channel.js').DiscordChannelOptions;

type SlackChannelCtor = typeof import('./channels/slack/channel.js').SlackChannel;
type SlackOptions = import('./channels/slack/channel.js').SlackChannelOptions;

export interface HubOptions {
  /** CMDOP cloud API key. If omitted, uses local IPC connection. */
  apiKey?: string;
  /** Connect to local IPC agent instead of cloud. Default: false unless apiKey is absent. */
  local?: boolean;
  /** Default machine hostname for all operations. */
  defaultMachine?: string;
  /** Permission store for user levels. Default: in-memory. */
  permissionStore?: PermissionStoreProtocol;
  /** Admin user IDs (always have ADMIN permission). */
  adminUsers?: string[];
  /** Logger instance. Default: stderr JSON logger at info level. */
  logger?: LoggerProtocol;
  /** Bot settings. Default: loaded from environment variables. */
  settings?: Partial<BotSettings>;
  /**
   * Whether a channel start() failure should be treated as fatal (throws) or
   * isolated (logs error and continues with remaining channels).
   * Default: 'isolated'
   */
  channelStartMode?: 'strict' | 'isolated';
}

/** Per-channel runtime status */
export type ChannelStatus = 'pending' | 'running' | 'failed' | 'stopped';

export class IntegrationHub {
  private readonly channels = new Map<string, ChannelProtocol>();
  private readonly channelStatus = new Map<string, ChannelStatus>();
  private readonly _dispatcher: MessageDispatcher;
  private readonly _permissions: PermissionManager;
  private readonly channelStartMode: 'strict' | 'isolated';
  private started = false;

  private constructor(
    private readonly _client: CMDOPClient,
    private readonly _logger: LoggerProtocol,
    private readonly _settings: BotSettings,
    permissions: PermissionManager,
    dispatcher: MessageDispatcher,
    channelStartMode: 'strict' | 'isolated',
  ) {
    this._permissions = permissions;
    this._dispatcher = dispatcher;
    this.channelStartMode = channelStartMode;
  }

  /**
   * Create and configure an IntegrationHub.
   * Registers default handlers: exec, agent, files, help.
   */
  static async create(options: HubOptions = {}): Promise<IntegrationHub> {
    const settings = loadSettings();
    Object.assign(settings, options.settings ?? {});
    if (options.defaultMachine) settings.defaultMachine = options.defaultMachine;

    const logger = options.logger ?? createLogger(settings.logLevel);

    const client = options.apiKey
      ? await CMDOPClient.remote(options.apiKey)
      : await CMDOPClient.local();

    const store = options.permissionStore ?? new InMemoryPermissionStore();
    const identityMap = new IdentityMap();
    const permissions = new PermissionManager(store, {
      adminUsers: [...(options.adminUsers ?? []), ...settings.allowedUsers],
      identityMap,
    });

    const dispatcher = new MessageDispatcher(permissions, logger);
    const mode = options.channelStartMode ?? 'isolated';

    const hub = new IntegrationHub(client, logger, settings, permissions, dispatcher, mode);

    // Register default handlers
    hub.registerHandler(new TerminalHandler(client, logger, { maxOutputLength: settings.maxOutputLength }));
    hub.registerHandler(new AgentHandler(client, logger, { maxOutputLength: settings.maxOutputLength }));
    hub.registerHandler(new FilesHandler(client, logger));
    hub.registerHandler(new HelpHandler(client, logger, {
      getCommands: () => dispatcher.getCommandList(),
    }));

    return hub;
  }

  // ─── Channel registration ─────────────────────────────────────────────────

  registerChannel(channel: ChannelProtocol): this {
    this.channels.set(channel.id, channel);
    this.channelStatus.set(channel.id, 'pending');
    return this;
  }

  /**
   * Convenience: create and register a TelegramChannel without importing it manually.
   * Requires `grammy` to be installed.
   */
  async addTelegram(options: TelegramOptions): Promise<this> {
    const { TelegramChannel } = await import('./channels/telegram/channel.js') as { TelegramChannel: TelegramChannelCtor };
    const channel = new TelegramChannel(options, this._permissions, this._dispatcher, this._logger);
    return this.registerChannel(channel);
  }

  /**
   * Convenience: create and register a DiscordChannel without importing it manually.
   * Requires `discord.js`, `@discordjs/rest`, and `@discordjs/builders` to be installed.
   */
  async addDiscord(options: DiscordOptions): Promise<this> {
    const { DiscordChannel } = await import('./channels/discord/channel.js') as { DiscordChannel: DiscordChannelCtor };
    const channel = new DiscordChannel(options, this._permissions, this._dispatcher, this._logger);
    return this.registerChannel(channel);
  }

  /**
   * Convenience: create and register a SlackChannel without importing it manually.
   * Requires `@slack/bolt` and `@slack/web-api` to be installed.
   */
  async addSlack(options: SlackOptions): Promise<this> {
    const { SlackChannel } = await import('./channels/slack/channel.js') as { SlackChannel: SlackChannelCtor };
    const channel = new SlackChannel(options, this._permissions, this._dispatcher, this._logger);
    return this.registerChannel(channel);
  }

  registerHandler(handler: HandlerProtocol): this {
    this._dispatcher.register(handler);
    return this;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (this.channelStartMode === 'strict') {
      // All channels must start — any failure is fatal
      await Promise.all([...this.channels.values()].map(async (ch) => {
        await ch.start();
        this.channelStatus.set(ch.id, 'running');
      }));
    } else {
      // Isolated mode — a failing channel is logged but does not prevent others
      await Promise.allSettled([...this.channels.values()].map(async (ch) => {
        try {
          await ch.start();
          this.channelStatus.set(ch.id, 'running');
        } catch (err) {
          this.channelStatus.set(ch.id, 'failed');
          this._logger.error('Channel failed to start', {
            channel: ch.id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }));
    }

    this._logger.info('IntegrationHub started', {
      channels: [...this.channels.keys()],
      running: this.runningChannelIds,
      failed: this.failedChannelIds,
    });
  }

  async stop(): Promise<void> {
    this.started = false;
    const results = await Promise.allSettled(
      [...this.channels.values()].map(async (ch) => {
        await ch.stop();
        this.channelStatus.set(ch.id, 'stopped');
      }),
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        this._logger.error('Channel stop error', { reason: String(r.reason) });
      }
    }
    await this._client.close();
    this._logger.info('IntegrationHub stopped');
  }

  // ─── Identity linking ─────────────────────────────────────────────────────

  /**
   * Link two platform-scoped user IDs to share the same permission identity.
   *
   * Example — a user's Telegram ID and Discord ID map to the same permissions:
   *   hub.linkIdentities('telegram', '12345', 'discord', '67890');
   *
   * After linking, granting EXECUTE to the Telegram user also grants it to the
   * Discord user (and vice versa), because both resolve to the same canonical ID.
   */
  linkIdentities(
    channelA: string, userIdA: string,
    channelB: string, userIdB: string,
  ): void {
    const pidA = IdentityMap.platformId(channelA, userIdA);
    const pidB = IdentityMap.platformId(channelB, userIdB);
    this._permissions.identity.link(pidA, pidB);
  }

  // ─── Introspection ────────────────────────────────────────────────────────

  /** Get a registered channel by its ID, or undefined if not found. */
  getChannel(id: string): ChannelProtocol | undefined {
    return this.channels.get(id);
  }

  /** IDs of all registered channels. */
  get channelIds(): string[] {
    return [...this.channels.keys()];
  }

  /** Total number of registered channels. */
  get channelCount(): number {
    return this.channels.size;
  }

  /** IDs of channels that started successfully. */
  get runningChannelIds(): string[] {
    return [...this.channelStatus.entries()]
      .filter(([, s]) => s === 'running')
      .map(([id]) => id);
  }

  /** IDs of channels that failed to start. */
  get failedChannelIds(): string[] {
    return [...this.channelStatus.entries()]
      .filter(([, s]) => s === 'failed')
      .map(([id]) => id);
  }

  /** Runtime status of a specific channel. */
  getChannelStatus(id: string): ChannelStatus | undefined {
    return this.channelStatus.get(id);
  }

  /** Read-only access to the CMDOP client (for advanced usage in handlers). */
  get cmdop(): CMDOPClient {
    return this._client;
  }

  get settings(): BotSettings {
    return this._settings;
  }

  get isStarted(): boolean {
    return this.started;
  }

  /** Read-only access to the permission manager (for programmatic grants). */
  get permissions(): PermissionManager {
    return this._permissions;
  }
}
