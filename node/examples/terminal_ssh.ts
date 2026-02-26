#!/usr/bin/env npx tsx
/**
 * SSH-like terminal connection.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machine
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   # Connect to default machine (CMDOP_MACHINE env)
 *   pnpm tsx examples/terminal_ssh.ts
 *
 *   # Connect to specific hostname
 *   pnpm tsx examples/terminal_ssh.ts my-server
 *
 *   # Execute single command
 *   pnpm tsx examples/terminal_ssh.ts --exec "ls -la"
 *   pnpm tsx examples/terminal_ssh.ts my-server --exec "uname -a"
 *
 *   # With custom timeout
 *   pnpm tsx examples/terminal_ssh.ts --exec "apt update" --timeout 120
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key
 *   CMDOP_MACHINE: Default target hostname
 */

import { CMDOPClient, AgentOfflineError } from '@cmdop/node';

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  const apiKey = process.env.CMDOP_API_KEY ?? '';
  const defaultMachine = process.env.CMDOP_MACHINE ?? '';

  // Parse args
  let hostname = defaultMachine;
  let command: string | undefined;
  let timeoutSeconds = 60;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exec' || args[i] === '-e') {
      command = args[++i];
    } else if (args[i] === '--timeout' || args[i] === '-t') {
      timeoutSeconds = Number(args[++i]);
    } else if (!args[i]?.startsWith('-')) {
      hostname = args[i] ?? hostname;
    }
  }

  if (!apiKey) {
    console.error('Error: No API key. Set CMDOP_API_KEY env or use --api-key');
    return 1;
  }

  if (!hostname) {
    console.error('Error: No hostname. Set CMDOP_MACHINE env or pass as argument');
    return 1;
  }

  await using client = CMDOPClient.remote(apiKey);

  try {
    // Find active session for this machine
    const active = await client.terminal.getActiveSession(hostname);

    if (!active) {
      console.error(`No active session found for '${hostname}'`);

      const { sessions } = await client.terminal.list();
      if (sessions.length > 0) {
        console.error('\nAvailable machines:');
        for (const s of sessions) {
          const age = s.heartbeatAgeSeconds ? ` (${s.heartbeatAgeSeconds}s ago)` : '';
          console.error(`  - ${s.hostname ?? s.sessionId}${age}`);
        }
      }
      return 1;
    }

    console.log(`Connected to: ${active.hostname ?? active.sessionId}`);
    client.setSessionId(active.sessionId);

    if (command) {
      console.log(`$ ${command}\n`);
      const output = await client.terminal.execute(active.sessionId, command, {
        timeoutSeconds,
      });
      process.stdout.write(output.stdout ?? '');
      if (output.exitCode !== 0) {
        console.log(`\nExit code: ${output.exitCode}`);
      }
      return output.exitCode ?? 0;
    }

    // Interactive — list recent history as a simple fallback
    const history = await client.terminal.getHistory(active.sessionId, { limit: 20 });
    console.log(`\nRecent history (${history.total} commands):`);
    for (const cmd of history.commands.slice(-10)) {
      console.log(`  $ ${cmd}`);
    }
    return 0;

  } catch (error) {
    if (error instanceof AgentOfflineError) {
      console.error(`Agent '${hostname}' is offline`);
      return 1;
    }
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    return 1;
  }
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
