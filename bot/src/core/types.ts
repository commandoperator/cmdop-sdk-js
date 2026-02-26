import type { OutgoingMessage, IncomingMessage } from '../models/message.js';
import type { PermissionLevel } from '../models/user.js';
import type { CommandContext, CommandInfo } from '../models/command.js';
import type { BotError } from '../errors.js';

// ─────────────────────────────────────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────────────────────────────────────

export type HandlerResult =
  | { ok: true; value: OutgoingMessage }
  | { ok: false; error: BotError };

export function ok(value: OutgoingMessage): HandlerResult {
  return { ok: true, value };
}

export function err(error: BotError): HandlerResult {
  return { ok: false, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Protocols
// ─────────────────────────────────────────────────────────────────────────────

export interface ChannelProtocol {
  readonly id: string;
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(userId: string, message: OutgoingMessage): Promise<void>;
  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void;
}

export interface HandlerProtocol {
  readonly name: string;
  readonly description: string;
  readonly usage: string;
  readonly requiredPermission: PermissionLevel;
  handle(ctx: CommandContext): Promise<HandlerResult>;
}

export interface FormatterProtocol {
  formatText(text: string): string;
  formatCode(code: string, language?: string): string;
  formatError(error: BotError): string;
}

export interface PermissionStoreProtocol {
  getLevel(userId: string): Promise<PermissionLevel>;
  setLevel(userId: string, level: PermissionLevel): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

export interface LoggerProtocol {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

// Re-export for convenience
export type { OutgoingMessage, IncomingMessage, PermissionLevel, CommandContext, CommandInfo };
