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
 * Slack mrkdwn formatter.
 *
 * Slack uses its own "mrkdwn" dialect (not standard Markdown).
 * Bold: *text*   Italic: _text_   Code: `text`   Code block: ```text```
 * No escaping of . - ! etc. Special chars are: * _ ` & < >
 */

export const SLACK_MAX_TEXT_LENGTH = 3000;

export class SlackFormatter implements FormatterProtocol {
  /**
   * Escape mrkdwn special characters in plain text.
   * Slack requires escaping: & < >
   * Ampersand must be escaped first to avoid double-escaping.
   */
  formatText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Wrap code in a triple-backtick code block.
   * Truncates if over Slack's limit.
   */
  formatCode(code: string, language?: string): string {
    // Slack code blocks don't support language tags — ignore language param
    void language;
    const safeCode = code.replace(/```/g, "''`");
    const wrapped = `\`\`\`\n${safeCode}\n\`\`\``;

    if (wrapped.length <= SLACK_MAX_TEXT_LENGTH) return wrapped;

    const maxCode = SLACK_MAX_TEXT_LENGTH - 21;
    return `\`\`\`\n${safeCode.slice(0, maxCode)}\n…(truncated)\n\`\`\``;
  }

  /**
   * Format a BotError into a user-friendly Slack mrkdwn message.
   */
  formatError(error: BotError): string {
    if (error instanceof PermissionDeniedError) {
      const required = error.context['required'] as string;
      return `:no_entry: *Access denied* — required permission: \`${required}\``;
    }
    if (error instanceof CommandNotFoundError) {
      const cmd = error.context['command'] as string;
      return `:question: Unknown command \`/${cmd}\`. Type \`/help\` to see available commands.`;
    }
    if (error instanceof CommandArgsError) {
      return `:warning: ${this.formatText(error.message)}`;
    }
    if (error instanceof MachineOfflineError) {
      return `:electric_plug: *Machine offline* — ${this.formatText(error.message)}`;
    }
    if (error instanceof RateLimitError) {
      return `:hourglass_flowing_sand: Rate limit reached. Please wait and try again.`;
    }
    // Generic fallback — do not expose internal details
    return `:x: Something went wrong. Please try again.`;
  }

  /**
   * Format a file listing entry line.
   */
  formatFileEntry(name: string, isDir: boolean, size?: number): string {
    const icon = isDir ? ':file_folder:' : ':page_facing_up:';
    const sizeStr = size !== undefined && !isDir ? ` (${formatBytes(size)})` : '';
    return `${icon} \`${name}\`${sizeStr}`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
