import { z } from 'zod/v4';
import { ConfigError } from './errors.js';

export const BotSettingsSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  allowedUsers: z.array(z.string()).default([]),
  maxOutputLength: z.number().int().positive().default(4000),
  debounceMs: z.number().int().min(100).max(5000).default(500),
  defaultMachine: z.string().optional(),
});
export type BotSettings = z.infer<typeof BotSettingsSchema>;

export function loadSettings(env: NodeJS.ProcessEnv = process.env): BotSettings {
  const raw = {
    logLevel: env['BOT_LOG_LEVEL'],
    allowedUsers: env['BOT_ALLOWED_USERS']?.split(',').map((s) => s.trim()).filter(Boolean),
    maxOutputLength: env['BOT_MAX_OUTPUT'] ? Number(env['BOT_MAX_OUTPUT']) : undefined,
    debounceMs: env['BOT_DEBOUNCE_MS'] ? Number(env['BOT_DEBOUNCE_MS']) : undefined,
    defaultMachine: env['CMDOP_MACHINE'],
  };

  const result = BotSettingsSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(`Invalid bot configuration: ${result.error.message}`);
  }
  return result.data;
}
