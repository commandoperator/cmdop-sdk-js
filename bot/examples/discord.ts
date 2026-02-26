#!/usr/bin/env tsx
/**
 * Discord Bot Example
 *
 * Run:
 *   CMDOP_API_KEY=cmdop_live_xxx DISCORD_TOKEN=xxx DISCORD_CLIENT_ID=xxx pnpm tsx examples/discord.ts
 *
 * Required env vars:
 *   CMDOP_API_KEY       — CMDOP cloud API key (omit to use local IPC)
 *   DISCORD_TOKEN       — Bot token from Discord Developer Portal
 *   DISCORD_CLIENT_ID   — Application ID from Discord Developer Portal
 *
 * Optional env vars:
 *   DISCORD_GUILD_ID    — Register commands to a specific guild (instant); omit for global (up to 1h)
 *   CMDOP_MACHINE       — Default machine hostname for all commands
 *   BOT_ALLOWED_USERS   — Comma-separated Discord user IDs that get ADMIN
 *   BOT_LOG_LEVEL       — debug | info | warn | error  (default: info)
 */

import { IntegrationHub } from '../src/index.js';

async function main() {
  const token = process.env['DISCORD_TOKEN'];
  if (!token) {
    console.error('DISCORD_TOKEN is required');
    process.exit(1);
  }

  const clientId = process.env['DISCORD_CLIENT_ID'];
  if (!clientId) {
    console.error('DISCORD_CLIENT_ID is required');
    process.exit(1);
  }

  const hub = await IntegrationHub.create({
    apiKey: process.env['CMDOP_API_KEY'],
    defaultMachine: process.env['CMDOP_MACHINE'],
    adminUsers: (process.env['BOT_ALLOWED_USERS'] ?? '').split(',').filter(Boolean),
  });

  // addDiscord() wires permissions + dispatcher automatically
  await hub.addDiscord({
    token,
    clientId,
    guildId: process.env['DISCORD_GUILD_ID'],
  });

  await hub.start();
  console.log('✅ Discord bot running. Press Ctrl+C to stop.');
  console.log('Slash commands: /exec  /agent  /files  /help\n');

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
