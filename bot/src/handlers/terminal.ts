import type { CMDOPClient } from '@cmdop/node';
import { BaseHandler } from '../core/base-handler.js';
import { ok, err } from '../core/types.js';
import type { HandlerResult, LoggerProtocol } from '../core/types.js';
import type { CommandContext } from '../models/command.js';
import { CommandArgsError, CMDOPError } from '../errors.js';

const MAX_OUTPUT = 4000;
const DEFAULT_TIMEOUT_MS = 30_000;

export interface TerminalHandlerConfig {
  maxOutputLength?: number;
  defaultTimeoutMs?: number;
}

export class TerminalHandler extends BaseHandler {
  readonly name = 'exec';
  readonly description = 'Execute a shell command on the remote machine';
  readonly usage = '/exec <command>';
  readonly requiredPermission = 'EXECUTE' as const;

  private readonly maxOutput: number;
  private readonly timeoutMs: number;

  constructor(client: CMDOPClient, logger: LoggerProtocol, config: TerminalHandlerConfig = {}) {
    super(client, logger);
    this.maxOutput = config.maxOutputLength ?? MAX_OUTPUT;
    this.timeoutMs = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async handle(ctx: CommandContext): Promise<HandlerResult> {
    const command = ctx.args.join(' ').trim();
    if (!command) {
      return err(new CommandArgsError('exec', 'A shell command is required. Example: /exec ls -la'));
    }

    try {
      // Route to machine if specified
      if (ctx.machine) {
        const active = await this.client.terminal.getActiveSession({ hostname: ctx.machine });
        if (!active) {
          return err(new CMDOPError(`No active session on machine '${ctx.machine}'`));
        }
        // Use sessionId option on execute
        const result = await this.client.terminal.execute(command, {
          sessionId: active.sessionId,
          timeoutMs: this.timeoutMs,
        });
        return this.formatResult(result.output, result.exitCode);
      }

      // Default: use currently tracked session
      const { sessions } = await this.client.terminal.list();
      if (sessions.length === 0) {
        return err(new CMDOPError('No active sessions. Start the CMDOP agent first.'));
      }

      const result = await this.client.terminal.execute(command, {
        sessionId: sessions[0]!.sessionId,
        timeoutMs: this.timeoutMs,
      });
      return this.formatResult(result.output, result.exitCode);
    } catch (e) {
      return err(new CMDOPError('Terminal execution failed', e instanceof Error ? e : undefined));
    }
  }

  private formatResult(output: string, exitCode: number): HandlerResult {
    const truncated = output.length > this.maxOutput
      ? output.slice(0, this.maxOutput) + '\n...(truncated)'
      : output;

    const exitInfo = exitCode !== 0 ? ` (exit ${exitCode})` : '';
    const code = (truncated.trim() || `(no output)`) + (exitCode !== 0 ? exitInfo : '');

    return ok({ type: 'code', code, language: 'text' });
  }
}
