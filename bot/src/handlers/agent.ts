import type { CMDOPClient } from '@cmdop/node';
import { BaseHandler } from '../core/base-handler.js';
import { ok, err } from '../core/types.js';
import type { HandlerResult, LoggerProtocol } from '../core/types.js';
import type { CommandContext } from '../models/command.js';
import { CommandArgsError, CMDOPError } from '../errors.js';

export interface AgentHandlerConfig {
  timeoutSeconds?: number;
  maxOutputLength?: number;
}

export class AgentHandler extends BaseHandler {
  readonly name = 'agent';
  readonly description = 'Run an AI agent prompt on the remote machine';
  readonly usage = '/agent <prompt>';
  readonly requiredPermission = 'EXECUTE' as const;

  private readonly timeout: number;
  private readonly maxOutput: number;

  constructor(client: CMDOPClient, logger: LoggerProtocol, config: AgentHandlerConfig = {}) {
    super(client, logger);
    this.timeout = config.timeoutSeconds ?? 60;
    this.maxOutput = config.maxOutputLength ?? 4000;
  }

  async handle(ctx: CommandContext): Promise<HandlerResult> {
    const prompt = ctx.args.join(' ').trim();
    if (!prompt) {
      return err(new CommandArgsError('agent', 'A prompt is required. Example: /agent list files in /tmp'));
    }

    try {
      if (ctx.machine) {
        await this.client.agent.setMachine(ctx.machine);
      }

      const result = await this.client.agent.run(prompt, {
        mode: 'chat',
        timeoutSeconds: this.timeout,
      });

      if (!result.success) {
        return err(new CMDOPError(result.error ?? 'Agent returned no result'));
      }

      const text = result.text.length > this.maxOutput
        ? result.text.slice(0, this.maxOutput) + '\n...(truncated)'
        : result.text;

      return ok({ type: 'text', text });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.error('Agent execution failed', { error: errMsg });

      // User-friendly error messages
      if (errMsg.includes('session_id') || errMsg.includes('No active session')) {
        return err(new CMDOPError('Machine is offline or CMDOP agent is not running.\nhttps://cmdop.com/downloads/'));
      }
      if (errMsg.includes('context canceled') || errMsg.includes('CANCELLED')) {
        return err(new CMDOPError('Request was interrupted. Please try again.'));
      }
      if (errMsg.includes('DEADLINE_EXCEEDED') || errMsg.includes('timeout')) {
        return err(new CMDOPError('Request timed out. The task may be too complex — try a simpler prompt.'));
      }
      if (errMsg.includes('UNAVAILABLE') || errMsg.includes('Connection refused')) {
        return err(new CMDOPError('Server unavailable. Check your connection and try again.'));
      }
      return err(new CMDOPError(`Agent error: ${errMsg}`, e instanceof Error ? e : undefined));
    }
  }
}
