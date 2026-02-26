import { z } from 'zod/v4';
import type { IncomingMessage } from './message.js';

export const ParsedCommandSchema = z.object({
  name: z.string().min(1),
  args: z.array(z.string()),
  rawText: z.string(),
});
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;

export type CommandContext = {
  readonly userId: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly channelId: string;
  readonly message: IncomingMessage;
  readonly machine?: string;
};

export type CommandInfo = {
  readonly name: string;
  readonly description: string;
  readonly usage: string;
  readonly requiredPermission: string;
};

/**
 * Parse a bot command from message text.
 * Supports: /exec ls -la, !exec ls -la
 * Requires a / or ! prefix to distinguish commands from plain chat messages.
 */
export function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();
  // Require leading / or !
  const match = /^[/!](\w+)(?:\s+(.*))?$/s.exec(trimmed);
  if (!match) return null;

  const name = (match[1] ?? '').toLowerCase();
  const rest = (match[2] ?? '').trim();
  const args = rest ? rest.split(/\s+/) : [];

  return ParsedCommandSchema.parse({ name, args, rawText: trimmed });
}
