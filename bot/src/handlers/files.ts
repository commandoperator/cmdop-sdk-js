import type { CMDOPClient } from '@cmdop/node';
import { BaseHandler } from '../core/base-handler.js';
import { ok, err } from '../core/types.js';
import type { HandlerResult, LoggerProtocol } from '../core/types.js';
import type { CommandContext } from '../models/command.js';
import { CommandArgsError, CMDOPError } from '../errors.js';

export interface FilesHandlerConfig {
  maxEntries?: number;
  maxFileSize?: number;
}

export class FilesHandler extends BaseHandler {
  readonly name = 'files';
  readonly description = 'List files in a directory on the remote machine';
  readonly usage = '/files <path>';
  readonly requiredPermission = 'READ' as const;

  private readonly maxEntries: number;

  constructor(client: CMDOPClient, logger: LoggerProtocol, config: FilesHandlerConfig = {}) {
    super(client, logger);
    this.maxEntries = config.maxEntries ?? 50;
  }

  async handle(ctx: CommandContext): Promise<HandlerResult> {
    const subCommand = ctx.args[0] ?? 'list';
    const path = ctx.args[1] ?? ctx.args[0] ?? '/';

    // Detect if first arg looks like a path (not a subcommand)
    const isPathOnly = ctx.args.length === 1 && (path.startsWith('/') || path.startsWith('~') || path.startsWith('.'));

    if (isPathOnly || subCommand === 'list' || subCommand === 'ls') {
      return this.handleList(ctx, isPathOnly ? path : (ctx.args[1] ?? '/'));
    }

    if (subCommand === 'read' || subCommand === 'cat') {
      return this.handleRead(ctx, ctx.args[1] ?? '');
    }

    return err(new CommandArgsError('files', 'Usage: /files <path> | /files read <path>'));
  }

  private async handleList(ctx: CommandContext, path: string): Promise<HandlerResult> {
    if (!path) {
      return err(new CommandArgsError('files', 'Path required. Example: /files /tmp'));
    }
    try {
      if (ctx.machine) await this.client.files.setMachine(ctx.machine);
      const result = await this.client.files.list(path, { pageSize: this.maxEntries });
      if (result.entries.length === 0) {
        return ok({ type: 'text', text: `📂 \`${path}\` is empty` });
      }
      const lines = result.entries.map((e) => {
        const icon = e.type === 'directory' ? '📁' : '📄';
        const size = e.type === 'file' ? ` (${formatSize(e.size ?? 0)})` : '';
        return `${icon} ${e.name}${size}`;
      });
      const header = `📂 **${path}** — ${result.entries.length} entries`;
      const more = result.totalCount > result.entries.length
        ? `\n_...and ${result.totalCount - result.entries.length} more_`
        : '';
      return ok({ type: 'text', text: `${header}\n${lines.join('\n')}${more}` });
    } catch (e) {
      return err(new CMDOPError(`Failed to list ${path}`, e instanceof Error ? e : undefined));
    }
  }

  private async handleRead(ctx: CommandContext, path: string): Promise<HandlerResult> {
    if (!path) {
      return err(new CommandArgsError('files', 'Path required. Example: /files read /etc/hostname'));
    }
    try {
      if (ctx.machine) await this.client.files.setMachine(ctx.machine);
      const result = await this.client.files.read(path);
      const content = result.content.slice(0, 3000);
      const truncated = result.content.length > 3000 ? '\n...(truncated)' : '';
      return ok({ type: 'code', code: content + truncated });
    } catch (e) {
      return err(new CMDOPError(`Failed to read ${path}`, e instanceof Error ? e : undefined));
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
