import type { CMDOPClient } from '@cmdop/node';
import { BaseHandler } from '../core/base-handler.js';
import { ok } from '../core/types.js';
import type { HandlerResult, LoggerProtocol } from '../core/types.js';
import type { CommandContext, CommandInfo } from '../models/command.js';

export interface HelpHandlerConfig {
  getCommands: () => CommandInfo[];
}

export class HelpHandler extends BaseHandler {
  readonly name = 'help';
  readonly description = 'Show available commands and their usage';
  readonly usage = '/help';
  readonly requiredPermission = 'NONE' as const;

  constructor(
    client: CMDOPClient,
    logger: LoggerProtocol,
    private readonly config: HelpHandlerConfig,
  ) {
    super(client, logger);
  }

  async handle(_ctx: CommandContext): Promise<HandlerResult> {
    const commands = this.config.getCommands();

    const lines = commands.map((cmd) =>
      `**/${cmd.name}** — ${cmd.description}\n  _Usage:_ \`${cmd.usage}\`  _Permission:_ ${cmd.requiredPermission}`,
    );

    const text = `**CMDOP Bot Commands**\n\n${lines.join('\n\n')}`;
    return ok({ type: 'text', text });
  }
}
