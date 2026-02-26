# @cmdop/bot — Changelog

## 2026.3.0 — 2026-03-01

Initial release.

### Features

- **`IntegrationHub`** — single entry point that wires channels, handlers, CMDOP client, and permissions together
  - `create({ apiKey?, local?, defaultMachine?, adminUsers?, channelStartMode? })`
  - `addTelegram()`, `addDiscord()`, `addSlack()` — lazy channel registration (platform deps optional)
  - `start()` / `stop()` — concurrent channel lifecycle with per-channel error isolation
  - `linkIdentities()` — cross-channel user identity linking
  - `permissions`, `runningChannelIds`, `failedChannelIds`, `getChannelStatus()` — introspection

- **Telegram** (`grammy`) — text/MarkdownV2, token streaming with debounced edits, inline keyboards, throttler plugin

- **Discord** (`discord.js`) — slash commands (`/exec`, `/agent`, `/files`, `/help`), `deferReply` for long ops, rate-limit monitoring

- **Slack** (`@slack/bolt`) — Socket Mode, `Assistant` lifecycle (`threadStarted`, `userMessage`), Block Kit builders, native `chatStream`

- **Handlers**
  - `TerminalHandler` — `/exec <command>` (requires `EXECUTE`)
  - `AgentHandler` — `/agent <prompt>` (requires `EXECUTE`)
  - `FilesHandler` — `/files [read] <path>` (requires `READ`)
  - `HelpHandler` — `/help` (no permission required)

- **Permission system** — five levels `NONE / READ / EXECUTE / FILES / ADMIN`, `IdentityMap` for cross-channel identity, `InMemoryPermissionStore` (default) + `PermissionStoreProtocol` for custom backends

- **Streaming** — `TokenBuffer` (debounced flush, drain on shutdown), `SlackStream` (native `chatStream` wrapper)

- **Error hierarchy** — all errors extend `BotError` with `.code`, never exposes raw platform errors

- **`DemoChannel`** — in-process channel for local testing and CLI usage (`injectMessage()`)

- **`BaseChannel`** / **`BaseHandler`** — extension points for custom platform integrations
