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
      return err(new CMDOPError('Agent execution failed', e instanceof Error ? e : undefined));
    }
  }
}
