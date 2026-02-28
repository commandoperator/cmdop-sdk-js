#!/usr/bin/env tsx
/**
 * Multi-Channel Bot Example
 *
 * Runs Telegram + Discord + Slack concurrently from a single hub.
 * All three channels share the same permission store and CMDOP client,
 * so a user granted EXECUTE on Telegram automatically has it on Discord/Slack.
 *
 * Run:
 *   TELEGRAM_TOKEN=xxx \
 *   DISCORD_TOKEN=xxx \
 *   DISCORD_CLIENT_ID=xxx \
 *   SLACK_BOT_TOKEN=xoxb-xxx \
 *   SLACK_APP_TOKEN=xapp-xxx \
 *   CMDOP_API_KEY=cmdop_live_xxx \
 *   pnpm tsx examples/multi-channel.ts
 *
 * Required env vars:
 *   CMDOP_API_KEY         — CMDOP cloud API key (omit for local IPC)
 *   TELEGRAM_TOKEN        — Telegram bot token from @BotFather
 *   DISCORD_TOKEN         — Bot token from Discord Developer Portal
 *   DISCORD_CLIENT_ID     — Application ID from Discord Developer Portal
 *   SLACK_BOT_TOKEN       — Bot OAuth token (xoxb-...)
 *   SLACK_APP_TOKEN       — App-level token for Socket Mode (xapp-...)
 *
 * Optional env vars:
 *   DISCORD_GUILD_ID      — Instant slash command registration for a guild
 *   CMDOP_MACHINE         — Default machine hostname
 *   BOT_ALLOWED_USERS     — Comma-separated user IDs that get ADMIN (any platform)
 *   BOT_LOG_LEVEL         — debug | info | warn | error  (default: info)
 */

import { IntegrationHub, IdentityMap } from '../src/index.js';

async function main() {
  // ─── Validate required env vars ────────────────────────────────────────────
  const telegramToken = process.env['TELEGRAM_TOKEN'];
  const discordToken = process.env['DISCORD_TOKEN'];
  const discordClientId = process.env['DISCORD_CLIENT_ID'];
  const slackBotToken = process.env['SLACK_BOT_TOKEN'];
  const slackAppToken = process.env['SLACK_APP_TOKEN'];

  const missing: string[] = [];
  if (!telegramToken) missing.push('TELEGRAM_TOKEN');
  if (!discordToken) missing.push('DISCORD_TOKEN');
  if (!discordClientId) missing.push('DISCORD_CLIENT_ID');
  if (!slackBotToken) missing.push('SLACK_BOT_TOKEN');
  if (!slackAppToken) missing.push('SLACK_APP_TOKEN');

  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  // ─── Create hub — shared CMDOP client, permissions, dispatcher ─────────────
  const hub = await IntegrationHub.create({
    apiKey: process.env['CMDOP_API_KEY'],
    defaultMachine: process.env['CMDOP_MACHINE'],
    adminUsers: (process.env['BOT_ALLOWED_USERS'] ?? '').split(',').filter(Boolean),
    // 'isolated' (default): a failing channel doesn't block the others
    channelStartMode: 'isolated',
  });

  // ─── Register channels ─────────────────────────────────────────────────────
  await hub.addTelegram({ token: telegramToken! });
  await hub.addDiscord({ token: discordToken!, clientId: discordClientId!, guildId: process.env['DISCORD_GUILD_ID'] });
  await hub.addSlack({ token: slackBotToken!, appToken: slackAppToken! });

  // ─── Cross-channel identity example ───────────────────────────────────────
  // If you know a Telegram user and their Discord account are the same person,
  // link them so permissions granted on one platform apply to the other.
  // In a real app, you'd build a /link command to let users do this themselves.
  //
  // hub.linkIdentities('telegram', '12345678', 'discord', '987654321098765432');
  //
  // After linking: granting EXECUTE to the Telegram user also applies on Discord.
  // await hub.permissions.setLevel('telegram:12345678', 'EXECUTE');

  // ─── Start all channels concurrently ──────────────────────────────────────
  await hub.start();

  const running = hub.runningChannelIds;
  const failed = hub.failedChannelIds;

  console.log(`✅ IntegrationHub started (${running.length}/${hub.channelCount} channels running)`);
  if (running.length > 0) console.log(`   Running: ${running.join(', ')}`);
  if (failed.length > 0) console.warn(`   ⚠️  Failed: ${failed.join(', ')}`);
  console.log('Commands: /exec  /agent  /skills  /files  /help\n');

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  async function shutdown(signal: string) {
    console.log(`\n${signal} received, shutting down...`);
    await hub.stop();
    console.log('Clean shutdown.');
    process.exit(0);
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
