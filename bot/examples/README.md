# @cmdop/bot — Examples

Runnable examples for each supported platform. All examples use `tsx` to run TypeScript directly.

## Prerequisites

```bash
pnpm add @cmdop/bot
# Install only the platform you need:
pnpm add grammy @grammyjs/transformer-throttler          # Telegram
pnpm add discord.js @discordjs/rest @discordjs/builders  # Discord
pnpm add @slack/bolt @slack/web-api                      # Slack
```

---

## telegram.ts — Telegram bot

```bash
CMDOP_API_KEY=cmdop_live_xxx \
TELEGRAM_TOKEN=123456:ABC-DEF \
pnpm tsx examples/telegram.ts
```

**Required env vars:**
- `TELEGRAM_TOKEN` — get from [@BotFather](https://t.me/BotFather)

**Optional:**
- `CMDOP_API_KEY` — omit to use local IPC connection
- `CMDOP_MACHINE` — pre-select a machine hostname
- `BOT_ALLOWED_USERS` — comma-separated Telegram user IDs that receive `ADMIN`

---

## discord.ts — Discord bot (slash commands)

```bash
CMDOP_API_KEY=cmdop_live_xxx \
DISCORD_TOKEN=your-bot-token \
DISCORD_CLIENT_ID=your-app-id \
DISCORD_GUILD_ID=your-guild-id \
pnpm tsx examples/discord.ts
```

**Required env vars:**
- `DISCORD_TOKEN` — bot token from [Discord Developer Portal](https://discord.com/developers)
- `DISCORD_CLIENT_ID` — application ID from the same portal

**Optional:**
- `DISCORD_GUILD_ID` — register commands to a single guild (instant); omit for global (up to 1 hour)
- `BOT_ALLOWED_USERS` — comma-separated Discord user IDs that receive `ADMIN`

**Bot permissions required:** `applications.commands`, `bot` scope with `Send Messages`.

---

## slack.ts — Slack bot (Socket Mode)

```bash
CMDOP_API_KEY=cmdop_live_xxx \
SLACK_BOT_TOKEN=xoxb-xxx \
SLACK_APP_TOKEN=xapp-xxx \
pnpm tsx examples/slack.ts
```

**Required env vars:**
- `SLACK_BOT_TOKEN` — bot OAuth token (starts with `xoxb-`)
- `SLACK_APP_TOKEN` — app-level token for Socket Mode (starts with `xapp-`)

**Slack app setup:**
1. Enable **Socket Mode** in your app settings
2. Add `connections:write` scope to the App-level token
3. Subscribe to bot events: `message.im`, `message.channels`, `app_mention`
4. Enable **Messages Tab** in App Home settings

**Optional:**
- `BOT_ALLOWED_USERS` — comma-separated Slack user IDs that receive `ADMIN`

---

## multi-channel.ts — All platforms at once

```bash
CMDOP_API_KEY=cmdop_live_xxx \
TELEGRAM_TOKEN=xxx \
DISCORD_TOKEN=xxx \
DISCORD_CLIENT_ID=xxx \
SLACK_BOT_TOKEN=xoxb-xxx \
SLACK_APP_TOKEN=xapp-xxx \
pnpm tsx examples/multi-channel.ts
```

All channels share the same permission store. A user granted `EXECUTE` on Telegram has it on Discord and Slack too (if their identities are linked via `hub.linkIdentities()`).

---

## custom-channel.ts — Build your own platform integration

Shows how to implement `ChannelProtocol` for any messaging platform not built into `@cmdop/bot`.

```bash
pnpm tsx examples/custom-channel.ts
```

No external dependencies — uses an in-process event emitter to simulate a platform.

---

## Running with a local CMDOP agent

Omit `CMDOP_API_KEY` to connect via local IPC (requires the CMDOP agent running on your machine):

```bash
TELEGRAM_TOKEN=xxx pnpm tsx examples/telegram.ts
```

---

## Common patterns

### Grant permission to a specific user

```ts
// After hub is created, before hub.start():
await hub.permissions.setLevel('telegram:123456789', 'EXECUTE');
```

### Pre-select a machine for all commands

```ts
const hub = await IntegrationHub.create({
  defaultMachine: 'my-server.local',
});
```

### Check which channels started successfully

```ts
await hub.start();
console.log('Running:', hub.runningChannelIds);
console.log('Failed: ', hub.failedChannelIds);
```
