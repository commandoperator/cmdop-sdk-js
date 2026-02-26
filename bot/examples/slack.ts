#!/usr/bin/env tsx
/**
 * Slack Bot Example (Socket Mode)
 *
 * Run:
 *   CMDOP_API_KEY=cmdop_live_xxx SLACK_BOT_TOKEN=xoxb-xxx SLACK_APP_TOKEN=xapp-xxx pnpm tsx examples/slack.ts
 *
 * Required env vars:
 *   CMDOP_API_KEY       — CMDOP cloud API key (omit to use local IPC)
 *   SLACK_BOT_TOKEN     — Bot OAuth token (xoxb-...)
 *   SLACK_APP_TOKEN     — App-level token for Socket Mode (xapp-...)
 *
 * Optional env vars:
 *   CMDOP_MACHINE       — Default machine hostname for all commands
 *   BOT_ALLOWED_USERS   — Comma-separated Slack user IDs that get ADMIN
 *   BOT_LOG_LEVEL       — debug | info | warn | error  (default: info)
 *
 * Slack app setup:
 *   1. Enable Socket Mode in your Slack app settings
 *   2. Enable the "connections:write" scope for the App-level token
 *   3. Subscribe to bot events: message.im, message.channels, app_mention
 *   4. Enable "Messages Tab" in App Home settings
 */

import { IntegrationHub } from '../src/index.js';

async function main() {
  const token = process.env['SLACK_BOT_TOKEN'];
  if (!token) {
    console.error('SLACK_BOT_TOKEN is required');
    process.exit(1);
  }

  const appToken = process.env['SLACK_APP_TOKEN'];
  if (!appToken) {
    console.error('SLACK_APP_TOKEN is required');
    process.exit(1);
  }

  const hub = await IntegrationHub.create({
    apiKey: process.env['CMDOP_API_KEY'],
    defaultMachine: process.env['CMDOP_MACHINE'],
    adminUsers: (process.env['BOT_ALLOWED_USERS'] ?? '').split(',').filter(Boolean),
  });

  // addSlack() wires permissions + dispatcher automatically
  await hub.addSlack({ token, appToken });

  await hub.start();
  console.log('✅ Slack bot running (Socket Mode). Press Ctrl+C to stop.');
  console.log('Commands: /exec  /agent  /files  /help\n');

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
