/**
 * @cmdop/bot
 * Multi-channel bot integrations for CMDOP remote machine management.
 */

// ─── Hub ────────────────────────────────────────────────────────────────────
export { IntegrationHub } from './hub.js';
export type { HubOptions, ChannelStatus } from './hub.js';

// ─── Core ───────────────────────────────────────────────────────────────────
export { BaseChannel } from './core/base-channel.js';
export { BaseHandler } from './core/base-handler.js';
export { MessageDispatcher } from './core/dispatcher.js';
export { PermissionManager, InMemoryPermissionStore, IdentityMap } from './core/permission-manager.js';
export { createLogger } from './core/logger.js';
export { ok, err } from './core/types.js';
export type {
  ChannelProtocol,
  HandlerProtocol,
  FormatterProtocol,
  PermissionStoreProtocol,
  LoggerProtocol,
  HandlerResult,
} from './core/types.js';

// ─── Models ─────────────────────────────────────────────────────────────────
export * from './models/index.js';

// ─── Errors ─────────────────────────────────────────────────────────────────
export {
  BotError,
  PermissionDeniedError,
  RateLimitError,
  HandlerError,
  CommandNotFoundError,
  CommandArgsError,
  ExecutionTimeoutError,
  CMDOPError,
  MachineNotFoundError,
  MachineOfflineError,
  CMDOPTimeoutError,
  ChannelError,
  TelegramError,
  DiscordError,
  SlackError,
  TeamsError,
  ConfigError,
} from './errors.js';

// ─── Streaming ──────────────────────────────────────────────────────────────
export { TokenBuffer, SlackStream } from './streaming/index.js';

// ─── Handlers ───────────────────────────────────────────────────────────────
export { TerminalHandler, AgentHandler, FilesHandler, HelpHandler } from './handlers/index.js';
export type {
  TerminalHandlerConfig,
  AgentHandlerConfig,
  FilesHandlerConfig,
  HelpHandlerConfig,
} from './handlers/index.js';

// ─── Channels ───────────────────────────────────────────────────────────────
export { DemoChannel } from './channels/demo/index.js';
export type { DemoChannelOptions } from './channels/demo/index.js';

export { TelegramChannel, TelegramFormatter, buildInlineKeyboard, buildMachineKeyboard } from './channels/telegram/index.js';
export type { TelegramChannelOptions, KeyboardAction } from './channels/telegram/index.js';

export { DiscordChannel, DiscordFormatter, DISCORD_COMMANDS, DISCORD_COMMAND_NAMES } from './channels/discord/index.js';
export type { DiscordChannelOptions } from './channels/discord/index.js';

export {
  SlackChannel,
  SlackFormatter,
  SLACK_MAX_TEXT_LENGTH,
  sectionBlock,
  headerBlock,
  dividerBlock,
  contextBlock,
  fileListBlocks,
  machineStatusBlocks,
  errorBlocks,
} from './channels/slack/index.js';
export type { SlackChannelOptions, SlackBlock, FileEntry, MachineStatus } from './channels/slack/index.js';

// ─── Config ─────────────────────────────────────────────────────────────────
export { loadSettings, BotSettingsSchema } from './config.js';
export type { BotSettings } from './config.js';
