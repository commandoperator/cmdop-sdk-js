import type { LoggerProtocol } from './types.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(level: LogLevel = 'info'): LoggerProtocol {
  const minLevel = LEVELS[level];

  function log(lvl: LogLevel, msg: string, meta: Record<string, unknown> = {}): void {
    if (LEVELS[lvl] < minLevel) return;
    const entry = { ts: new Date().toISOString(), level: lvl, msg, ...meta };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta ?? {}),
    info:  (msg, meta) => log('info',  msg, meta ?? {}),
    warn:  (msg, meta) => log('warn',  msg, meta ?? {}),
    error: (msg, meta) => log('error', msg, meta ?? {}),
  };
}
