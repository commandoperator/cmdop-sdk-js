import type { FormatterProtocol } from '../../core/types.js';
import type { BotError } from '../../errors.js';
import {
  PermissionDeniedError,
  CommandNotFoundError,
  CommandArgsError,
  MachineOfflineError,
  RateLimitError,
} from '../../errors.js';

/**
 * Discord message formatter.
 *
 * Discord supports standard Markdown (not MarkdownV2), so no special escaping
 * is required for plain text. Code blocks use triple backtick with language tag.
 * Structured output uses Discord embeds (EmbedBuilder).
 */

export const DISCORD_MAX_MESSAGE_LENGTH = 2000;
export const DISCORD_MAX_EMBED_DESCRIPTION = 4096;

export class DiscordFormatter implements FormatterProtocol {
  /**
   * Escape Discord Markdown in user-supplied text.
   * Escapes: _ * ~ ` | > \
   */
  formatText(text: string): string {
    return text.replace(/[_*~`|>\\]/g, '\\$&');
  }

  /**
   * Wrap code in a triple-backtick code block.
   * Truncates if over Discord's limit.
   */
  formatCode(code: string, language?: string): string {
    const lang = language ?? '';
    // Prevent breaking out of code block
    const safeCode = code.replace(/```/g, "''`");
    const wrapped = `\`\`\`${lang}\n${safeCode}\n\`\`\``;

    if (wrapped.length <= DISCORD_MAX_MESSAGE_LENGTH) return wrapped;

    const overhead = 8 + lang.length;
    const maxCode = DISCORD_MAX_MESSAGE_LENGTH - overhead - 20;
    return `\`\`\`${lang}\n${safeCode.slice(0, maxCode)}\n…(truncated)\n\`\`\``;
  }

  /**
   * Format a BotError into a user-friendly Discord message.
   */
  formatError(error: BotError): string {
    if (error instanceof PermissionDeniedError) {
      const required = error.context['required'] as string;
      return `❌ **Access denied** — required permission: \`${required}\``;
    }
    if (error instanceof CommandNotFoundError) {
      const cmd = error.context['command'] as string;
      return `❓ Unknown command \`/${cmd}\`. Use \`/help\` to see available commands.`;
    }
    if (error instanceof CommandArgsError) {
      return `⚠️ ${error.message}`;
    }
    if (error instanceof MachineOfflineError) {
      return `🔌 **Machine offline** — ${error.message}`;
    }
    if (error instanceof RateLimitError) {
      return `⏳ Rate limit reached. Please wait and try again.`;
    }
    // Generic fallback — do not expose internal details
    return `❌ Something went wrong. Please try again.`;
  }

  /**
   * Format a file listing entry line.
   */
  formatFileEntry(name: string, isDir: boolean, size?: number): string {
    const icon = isDir ? '📁' : '📄';
    const sizeStr = size !== undefined && !isDir ? ` (${formatBytes(size)})` : '';
    return `${icon} \`${name}\`${sizeStr}`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
