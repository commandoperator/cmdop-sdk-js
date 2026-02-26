import type { FormatterProtocol } from '../../core/types.js';
import type { BotError } from '../../errors.js';
import { PermissionDeniedError, CommandNotFoundError, CommandArgsError, MachineOfflineError, RateLimitError } from '../../errors.js';

/**
 * Telegram MarkdownV2 formatter.
 *
 * Telegram MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * Bold: **text**, Code: `text`, Code block: ```lang\ntext\n```
 */

// All special chars that must be escaped in MarkdownV2 plain text
const MD_ESCAPE_RE = /[_*[\]()~`>#+\-=|{}.!\\]/g;

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
export const TELEGRAM_MAX_CAPTION_LENGTH = 1024;

export class TelegramFormatter implements FormatterProtocol {
  /**
   * Escape plain text for safe inclusion in MarkdownV2 messages.
   */
  formatText(text: string): string {
    return text.replace(MD_ESCAPE_RE, '\\$&');
  }

  /**
   * Wrap code in a triple-backtick code block.
   * Truncates if over Telegram's limit.
   */
  formatCode(code: string, language?: string): string {
    const lang = language ?? '';
    // Backticks inside the code block must be escaped if they appear at end of block
    // Simplest safe approach: ensure no ``` appears verbatim inside
    const safeCode = code.replace(/```/g, "''`");
    const wrapped = `\`\`\`${lang}\n${safeCode}\n\`\`\``;

    if (wrapped.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return wrapped;

    // Truncate the code content to fit
    const overhead = 8 + lang.length; // ```lang\n ... \n```
    const maxCode = TELEGRAM_MAX_MESSAGE_LENGTH - overhead - 20; // room for truncation msg
    return `\`\`\`${lang}\n${safeCode.slice(0, maxCode)}\n…(truncated)\n\`\`\``;
  }

  /**
   * Format a BotError into a user-friendly Telegram message.
   */
  formatError(error: BotError): string {
    if (error instanceof PermissionDeniedError) {
      return `❌ *Access denied*\nRequired permission: \`${this.escapeInline(error.context['required'] as string)}\``;
    }
    if (error instanceof CommandNotFoundError) {
      const cmd = this.escapeInline(error.context['command'] as string);
      return `❓ Unknown command: \`/${cmd}\`\nType /help for available commands\\.`;
    }
    if (error instanceof CommandArgsError) {
      return `⚠️ ${this.formatText(error.message)}`;
    }
    if (error instanceof MachineOfflineError) {
      return `🔌 *Machine offline*\n${this.formatText(error.message)}`;
    }
    if (error instanceof RateLimitError) {
      return `⏳ Rate limit reached\\. Please wait and try again\\.`;
    }
    // Generic fallback — do not expose internal details
    return `❌ Something went wrong\\. Please try again\\.`;
  }

  /**
   * Format a file listing entry line.
   */
  formatFileEntry(name: string, isDir: boolean, size?: number): string {
    const icon = isDir ? '📁' : '📄';
    const sizeStr = size !== undefined && !isDir ? ` \\(${this.formatText(formatBytes(size))}\\)` : '';
    return `${icon} \`${this.escapeInline(name)}\`${sizeStr}`;
  }

  // Escape text that appears inside inline code (backtick context)
  private escapeInline(text: string): string {
    return text.replace(/`/g, "'");
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
