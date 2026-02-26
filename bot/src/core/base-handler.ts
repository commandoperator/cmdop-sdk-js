import type { CMDOPClient } from '@cmdop/node';
import type { HandlerProtocol, HandlerResult, LoggerProtocol } from './types.js';
import type { CommandContext } from '../models/command.js';
import type { PermissionLevel } from '../models/user.js';

export abstract class BaseHandler implements HandlerProtocol {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly usage: string;
  abstract readonly requiredPermission: PermissionLevel;

  protected constructor(
    protected readonly client: CMDOPClient,
    protected readonly logger: LoggerProtocol,
  ) {}

  abstract handle(ctx: CommandContext): Promise<HandlerResult>;
}
