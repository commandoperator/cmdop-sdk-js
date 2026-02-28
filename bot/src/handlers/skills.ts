import type { CMDOPClient } from '@cmdop/node';
import { BaseHandler } from '../core/base-handler.js';
import { ok, err } from '../core/types.js';
import type { HandlerResult, LoggerProtocol } from '../core/types.js';
import type { CommandContext } from '../models/command.js';
import { CommandArgsError, CMDOPError } from '../errors.js';

export interface SkillsHandlerConfig {
  maxOutputLength?: number;
}

export class SkillsHandler extends BaseHandler {
  readonly name = 'skills';
  readonly description = 'List, show, or run skills on the remote machine';
  readonly usage = '/skills list | /skills show <name> | /skills run <name> <prompt>';
  readonly requiredPermission = 'EXECUTE' as const;

  private readonly maxOutput: number;

  constructor(client: CMDOPClient, logger: LoggerProtocol, config: SkillsHandlerConfig = {}) {
    super(client, logger);
    this.maxOutput = config.maxOutputLength ?? 4000;
  }

  async handle(ctx: CommandContext): Promise<HandlerResult> {
    const subcommand = ctx.args[0]?.toLowerCase();

    if (!subcommand) {
      return err(new CommandArgsError('skills', 'Subcommand required. Usage: /skills list | /skills show <name> | /skills run <name> <prompt>'));
    }

    try {
      if (ctx.machine) {
        await this.client.skills.setMachine(ctx.machine);
      }

      switch (subcommand) {
        case 'list':
          return await this.handleList();
        case 'show':
          return await this.handleShow(ctx);
        case 'run':
          return await this.handleRun(ctx);
        default:
          return err(new CommandArgsError('skills', `Unknown subcommand "${subcommand}". Usage: /skills list | /skills show <name> | /skills run <name> <prompt>`));
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.error('Skills operation failed', { error: errMsg });

      if (errMsg.includes('session_id') || errMsg.includes('No active session')) {
        return err(new CMDOPError('Machine is offline or CMDOP agent is not running.\nhttps://cmdop.com/downloads/'));
      }
      if (errMsg.includes('DEADLINE_EXCEEDED') || errMsg.includes('timeout')) {
        return err(new CMDOPError('Request timed out. The skill may be too complex — try a simpler prompt.'));
      }
      if (errMsg.includes('UNAVAILABLE') || errMsg.includes('Connection refused')) {
        return err(new CMDOPError('Server unavailable. Check your connection and try again.'));
      }
      return err(new CMDOPError(`Skills error: ${errMsg}`, e instanceof Error ? e : undefined));
    }
  }

  private async handleList(): Promise<HandlerResult> {
    const skills = await this.client.skills.list();

    if (skills.length === 0) {
      return ok({ type: 'text', text: 'No skills installed.' });
    }

    const lines = skills.map((s) =>
      s.description ? `${s.name} — ${s.description}` : s.name,
    );
    return ok({ type: 'text', text: lines.join('\n') });
  }

  private async handleShow(ctx: CommandContext): Promise<HandlerResult> {
    const name = ctx.args[1];
    if (!name) {
      return err(new CommandArgsError('skills', 'Skill name required. Usage: /skills show <name>'));
    }

    const detail = await this.client.skills.show(name);

    if (!detail.found) {
      return err(new CMDOPError(detail.error ?? `Skill "${name}" not found`));
    }

    const parts: string[] = [];
    if (detail.info) {
      parts.push(`Skill: ${detail.info.name}`);
      if (detail.info.description) parts.push(`Description: ${detail.info.description}`);
      if (detail.info.author) parts.push(`Author: ${detail.info.author}`);
      if (detail.info.version) parts.push(`Version: ${detail.info.version}`);
      if (detail.info.origin) parts.push(`Origin: ${detail.info.origin}`);
    }
    if (detail.source) parts.push(`Source: ${detail.source}`);
    if (detail.content) {
      const preview = detail.content.length > this.maxOutput
        ? detail.content.slice(0, this.maxOutput) + '\n...(truncated)'
        : detail.content;
      parts.push(`\nSystem prompt:\n${preview}`);
    }

    return ok({ type: 'code', code: parts.join('\n') });
  }

  private async handleRun(ctx: CommandContext): Promise<HandlerResult> {
    const name = ctx.args[1];
    if (!name) {
      return err(new CommandArgsError('skills', 'Skill name and prompt required. Usage: /skills run <name> <prompt>'));
    }

    const prompt = ctx.args.slice(2).join(' ').trim();
    if (!prompt) {
      return err(new CommandArgsError('skills', 'Prompt required. Usage: /skills run <name> <prompt>'));
    }

    const result = await this.client.skills.run(name, prompt);

    const code = result.text.length > this.maxOutput
      ? result.text.slice(0, this.maxOutput) + '\n...(truncated)'
      : result.text;

    return ok({ type: 'code', code });
  }
}
