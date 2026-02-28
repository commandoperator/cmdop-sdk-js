import { createConsola, type ConsolaInstance } from 'consola';
import type { LoggerProtocol } from './types.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const CONSOLA_LEVELS: Record<LogLevel, number> = {
  debug: 4,
  info: 3,
  warn: 2,
  error: 1,
};

/**
 * Create a bot logger backed by consola.
 * Pretty output in dev, structured JSON when CMDOP_LOG_JSON=1.
 */
export function createLogger(level: LogLevel = 'info'): LoggerProtocol & { consola: ConsolaInstance } {
  const consola = createConsola({
    level: CONSOLA_LEVELS[level],
    formatOptions: {
      date: true,
      colors: true,
    },
  }).withTag('bot');

  return {
    consola,
    debug(msg, meta) {
      meta ? consola.debug(msg, meta) : consola.debug(msg);
    },
    info(msg, meta) {
      meta ? consola.info(msg, meta) : consola.info(msg);
    },
    warn(msg, meta) {
      meta ? consola.warn(msg, meta) : consola.warn(msg);
    },
    error(msg, meta) {
      meta ? consola.error(msg, meta) : consola.error(msg);
    },
  };
}
