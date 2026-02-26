#!/usr/bin/env tsx
/**
 * Telegram Bot Example
 *
 * Run:
 *   CMDOP_API_KEY=cmdop_live_xxx TELEGRAM_TOKEN=xxx pnpm tsx examples/telegram.ts
 *
 * Required env vars:
 *   CMDOP_API_KEY       — CMDOP cloud API key (omit to use local IPC)
 *   TELEGRAM_TOKEN      — Telegram bot token from @BotFather
 *
 * Optional env vars:
 *   CMDOP_MACHINE       — Default machine hostname for all commands
 *   BOT_ALLOWED_USERS   — Comma-separated Telegram user IDs that get ADMIN
 *   BOT_LOG_LEVEL       — debug | info | warn | error  (default: info)
 */

import { IntegrationHub } from '../src/index.js';

async function main() {
  const token = process.env['TELEGRAM_TOKEN'];
  if (!token) {
    console.error('TELEGRAM_TOKEN is required');
    process.exit(1);
  }

  const hub = await IntegrationHub.create({
    apiKey: process.env['CMDOP_API_KEY'],
    defaultMachine: process.env['CMDOP_MACHINE'],
    adminUsers: (process.env['BOT_ALLOWED_USERS'] ?? '').split(',').filter(Boolean),
  });

  // addTelegram() wires permissions + dispatcher automatically
  await hub.addTelegram({ token });

  await hub.start();
  console.log('✅ Telegram bot running. Press Ctrl+C to stop.');
  console.log('Available commands: /exec  /agent  /files  /help\n');

  async function shutdown(signal: string) {
    console.log(`\n${signal} received, shutting down...`);
    await hub.stop();
    process.exit(0);
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
