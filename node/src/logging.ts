/**
 * SDK logging utilities
 *
 * Two loggers for different purposes:
 *
 *   logger  — SDK-internal structured logger (silent by default).
 *             Controlled via CMDOP_LOG_LEVEL / CMDOP_LOG_JSON env vars.
 *             Use for gRPC debug, transport internals, etc.
 *
 *   consola — User-facing pretty console output (always visible).
 *             Provides start/success/error/box/info for CLI/TUI scripts.
 *             Use for ssh.ts, examples, and any user-visible messages.
 */

import { createConsola } from 'consola';

// ============================================================================
// User-facing console (consola)
// ============================================================================

/**
 * Pretty console logger for user-facing CLI/TUI output.
 * Provides: start(), success(), error(), box(), info(), warn(), etc.
 */
export const consola = createConsola({ fancy: true } as any);

// ============================================================================
// SDK-internal structured logger
// ============================================================================

export type SdkLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<SdkLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

function getLogLevel(): SdkLogLevel {
  const env = (process.env['CMDOP_LOG_LEVEL'] ?? 'silent').toLowerCase();
  if (env in LEVELS) return env as SdkLogLevel;
  return 'silent';
}

function isJsonMode(): boolean {
  return process.env['CMDOP_LOG_JSON'] === '1' || process.env['CMDOP_LOG_JSON'] === 'true';
}

function formatMessage(
  level: SdkLogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  if (isJsonMode()) {
    return JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...context,
    });
  }

  const prefix = `[cmdop:${level}]`;
  if (context && Object.keys(context).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(context)}`;
  }
  return `${prefix} ${message}`;
}

function createLogger(): Logger {
  const levelNum = (l: SdkLogLevel) => LEVELS[l] ?? 4;
  return {
    debug(message, context) {
      if (levelNum(getLogLevel()) > levelNum('debug')) return;
      console.debug(formatMessage('debug', message, context));
    },
    info(message, context) {
      if (levelNum(getLogLevel()) > levelNum('info')) return;
      console.info(formatMessage('info', message, context));
    },
    warn(message, context) {
      if (levelNum(getLogLevel()) > levelNum('warn')) return;
      console.warn(formatMessage('warn', message, context));
    },
    error(message, context) {
      if (levelNum(getLogLevel()) > levelNum('error')) return;
      console.error(formatMessage('error', message, context));
    },
  };
}

/**
 * SDK-internal logger. Reads level from CMDOP_LOG_LEVEL env var on each call.
 * Default level is 'silent' (no output).
 */
export const logger: Logger = createLogger();
