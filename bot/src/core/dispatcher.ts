import { CommandNotFoundError } from '../errors.js';
import type { HandlerProtocol, HandlerResult, LoggerProtocol } from './types.js';
import type { CommandContext, CommandInfo } from '../models/command.js';
import type { PermissionLevel } from '../models/user.js';
import type { PermissionManager } from './permission-manager.js';
import { PERMISSION_ORDER } from '../models/user.js';

export class MessageDispatcher {
  private readonly handlers = new Map<string, HandlerProtocol>();

  constructor(
    private readonly permissions: PermissionManager,
    private readonly logger: LoggerProtocol,
  ) {}

  register(handler: HandlerProtocol): void {
    this.handlers.set(handler.name, handler);
  }

  async dispatch(ctx: CommandContext): Promise<HandlerResult> {
    const handler = this.handlers.get(ctx.command);
    if (!handler) {
      return { ok: false, error: new CommandNotFoundError(ctx.command) };
    }

    // Permission check
    await this.permissions.checkPermission(ctx.userId, handler.requiredPermission);

    const start = Date.now();
    try {
      const result = await handler.handle(ctx);
      this.logger.debug('Handler completed', {
        command: ctx.command,
        durationMs: Date.now() - start,
        ok: result.ok,
      });
      return result;
    } catch (err) {
      this.logger.error('Handler threw', {
        command: ctx.command,
        durationMs: Date.now() - start,
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  getCommandList(minPermission: PermissionLevel = 'NONE'): CommandInfo[] {
    const minOrder = PERMISSION_ORDER[minPermission];
    return [...this.handlers.values()]
      .filter((h) => PERMISSION_ORDER[h.requiredPermission] <= minOrder + 4) // show all accessible+next
      .map((h) => ({
        name: h.name,
        description: h.description,
        usage: h.usage,
        requiredPermission: h.requiredPermission,
      }));
  }

  hasCommand(name: string): boolean {
    return this.handlers.has(name);
  }
}
