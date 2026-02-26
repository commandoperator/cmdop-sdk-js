# CMDOP Node.js SDK — Examples

Practical examples for common CMDOP operations.

## Prerequisites

1. Download agent from [cmdop.com/downloads](https://cmdop.com/downloads/)
2. Install and authorize the agent on your machine
3. Get API key from [my.cmdop.com](https://my.cmdop.com/dashboard/settings/)

## Install

```bash
pnpm add @cmdop/node
# or
npm install @cmdop/node
```

## Examples

| Example | Description |
|---------|-------------|
| [terminal_ssh.ts](terminal_ssh.ts) | SSH-like terminal connection and command execution |
| [file_operations.ts](file_operations.ts) | Read, write, and list files on remote machines |
| [fleet_status.ts](fleet_status.ts) | Check status of all connected machines |
| [agent_structured.ts](agent_structured.ts) | AI agent with Zod structured output |
| [browser_automation.ts](browser_automation.ts) | Browser automation on remote machines |

## Configuration

All examples use environment variables:

```bash
export CMDOP_API_KEY="cmdop_live_xxx"  # Your API key
export CMDOP_MACHINE="my-server"       # Default target machine
```

## Running

```bash
# From SDK root:
pnpm tsx examples/terminal_ssh.ts
pnpm tsx examples/fleet_status.ts
pnpm tsx examples/file_operations.ts list /tmp
pnpm tsx examples/agent_structured.ts
pnpm tsx examples/browser_automation.ts https://example.com
```
