# CMDOP JavaScript SDK

![CMDOP SDK](https://raw.githubusercontent.com/commandoperator/cmdop-sdk-js/refs/heads/main/assets/cmdop_sdkjs.webp)

**Your OS. Online.** Full access to your machines from anywhere — terminal, files, browser, AI agent.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@cmdop/core`](./core) | [![npm](https://img.shields.io/npm/v/@cmdop/core)](https://www.npmjs.com/package/@cmdop/core) | Shared types, interfaces, and configuration |
| [`@cmdop/node`](./node) | [![npm](https://img.shields.io/npm/v/@cmdop/node)](https://www.npmjs.com/package/@cmdop/node) | Node.js SDK — server-side agent interaction via gRPC |
| [`@cmdop/bot`](./bot) | [![npm](https://img.shields.io/npm/v/@cmdop/bot)](https://www.npmjs.com/package/@cmdop/bot) | Multi-channel bot framework — Telegram, Discord, Slack |
| [`@cmdop/react`](./react) | [![npm](https://img.shields.io/npm/v/@cmdop/react)](https://www.npmjs.com/package/@cmdop/react) | React hooks and components for browser-based interaction |
| [`cmdok`](./cli) | [GitHub Releases](https://github.com/commandoperator/cmdop-sdk-js/releases/latest) | Standalone CLI binary — SSH, exec, AI agent |

## CLI

Standalone binary — no Node.js required:

```bash
# macOS / Linux
curl -fsSL cmdop.com/install-cli.sh | bash

# Connect to your machine
cmdok ssh
```

![cmdok ssh](https://raw.githubusercontent.com/commandoperator/cmdop-sdk-js/main/assets/cmdok-ssh.gif)

The CLI will prompt for your API key on first run, then show available machines. See [cli/README.md](./cli) for all commands.

## Install SDK

```bash
# Node.js
npm install @cmdop/node

# Bot
npm install @cmdop/bot

# React
npm install @cmdop/react
```

## Links

- [Homepage](https://cmdop.com)
- [Node.js SDK docs](https://cmdop.com/docs/sdk/node)
- [Bot SDK docs](https://cmdop.com/docs/sdk/node/bot)
- [React SDK docs](https://cmdop.com/docs/sdk/node/react)
- [CLI docs](https://cmdop.com/docs/sdk/cli)
- [Python SDK](https://github.com/commandoperator/cmdop-sdk)

## License

MIT
