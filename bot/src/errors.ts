/**
 * @cmdop/bot — Error hierarchy
 *
 * All errors thrown by @cmdop/bot extend BotError.
 * Never expose raw @cmdop/node or platform errors to consumers — wrap them.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

export class BotError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code ?? this.constructor.name;
    this.context = options.context ?? {};
  }

  toLog(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission
// ─────────────────────────────────────────────────────────────────────────────

export class PermissionDeniedError extends BotError {
  constructor(userId: string, required: string) {
    super(`User ${userId} requires ${required} permission`, {
      code: 'PERMISSION_DENIED',
      context: { userId, required },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────────────────────

export class RateLimitError extends BotError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message, {
      code: 'RATE_LIMIT',
      context: { retryAfterMs },
    });
    this.retryAfterMs = retryAfterMs;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler errors
// ─────────────────────────────────────────────────────────────────────────────

export class HandlerError extends BotError {
  constructor(message: string, options?: { code?: string; context?: Record<string, unknown>; cause?: Error }) {
    super(message, options);
  }
}

export class CommandNotFoundError extends HandlerError {
  constructor(command: string) {
    super(`Unknown command: /${command}`, {
      code: 'COMMAND_NOT_FOUND',
      context: { command },
    });
  }
}

export class CommandArgsError extends HandlerError {
  constructor(command: string, hint: string) {
    super(`Invalid usage: /${command} — ${hint}`, {
      code: 'COMMAND_ARGS',
      context: { command, hint },
    });
  }
}

export class ExecutionTimeoutError extends HandlerError {
  constructor(command: string, timeoutMs: number) {
    super(`Command '${command}' timed out after ${timeoutMs}ms`, {
      code: 'EXECUTION_TIMEOUT',
      context: { command, timeoutMs },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CMDOP / machine errors
// ─────────────────────────────────────────────────────────────────────────────

export class CMDOPError extends BotError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'CMDOP_ERROR', cause });
  }
}

export class MachineNotFoundError extends BotError {
  constructor(machine: string) {
    super(`Machine '${machine}' not found`, { code: 'MACHINE_NOT_FOUND', context: { machine } });
  }
}

export class MachineOfflineError extends BotError {
  constructor(machine: string) {
    super(`Machine '${machine}' is offline or has no active session`, { code: 'MACHINE_OFFLINE', context: { machine } });
  }
}

export class CMDOPTimeoutError extends BotError {
  constructor(operation: string, timeoutMs: number, cause?: Error) {
    super(`CMDOP operation '${operation}' timed out after ${timeoutMs}ms`, { code: 'CMDOP_TIMEOUT', context: { operation, timeoutMs }, cause });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel errors
// ─────────────────────────────────────────────────────────────────────────────

export class ChannelError extends BotError {
  constructor(message: string, options?: { code?: string; context?: Record<string, unknown>; cause?: Error }) {
    super(message, options);
  }
}

export class TelegramError extends ChannelError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'TELEGRAM_ERROR', cause });
  }
}

export class DiscordError extends ChannelError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'DISCORD_ERROR', cause });
  }
}

export class SlackError extends ChannelError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'SLACK_ERROR', cause });
  }
}

export class TeamsError extends ChannelError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'TEAMS_ERROR', cause });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export class ConfigError extends BotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'CONFIG_ERROR', context });
  }
}
