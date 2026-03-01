#!/usr/bin/env npx tsx
/**
 * SSH-like interactive terminal connection.
 *
 * Opens a full bidirectional terminal session to a remote machine —
 * stdin, stdout, resize, Ctrl+D to disconnect. Like `ssh`, but over
 * CMDOP's gRPC relay.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machine
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   # Interactive SSH (default machine from CMDOP_MACHINE)
 *   pnpm tsx examples/terminal_ssh.ts
 *
 *   # Interactive SSH to specific hostname
 *   pnpm tsx examples/terminal_ssh.ts my-server
 *
 *   # Execute single command (non-interactive)
 *   pnpm tsx examples/terminal_ssh.ts --exec "ls -la"
 *   pnpm tsx examples/terminal_ssh.ts my-server --exec "uname -a"
 *
 *   # Debug mode (log gRPC messages to stderr)
 *   DEBUG=1 pnpm tsx examples/terminal_ssh.ts
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key
 *   CMDOP_MACHINE: Default target hostname
 */

import { CMDOPClient, sshConnect, AgentOfflineError } from '@cmdop/node';

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  const apiKey = process.env.CMDOP_API_KEY ?? '';
  const defaultMachine = process.env.CMDOP_MACHINE ?? '';
  const debug = process.env.DEBUG === '1';

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
    console.error('Error: No API key. Set CMDOP_API_KEY environment variable');
    return 1;
  }

  if (!hostname) {
    console.error('Error: No hostname. Set CMDOP_MACHINE env or pass as argument');
    return 1;
  }

  const client = CMDOPClient.remote(apiKey);

  try {
    if (command) {
      // Non-interactive: execute single command
      await client.terminal.setMachine(hostname);

      console.log(`$ ${command}\n`);
      const { output, exitCode } = await client.terminal.execute(command, {
        timeoutMs: timeoutSeconds * 1000,
      });
      if (output) process.stdout.write(output + '\n');
      if (exitCode !== 0) console.error(`\nExit code: ${exitCode}`);
      return exitCode;
    }

    // Interactive: full SSH-like session
    return await sshConnect({ client, hostname, debug });

  } catch (error) {
    if (error instanceof AgentOfflineError) {
      console.error(`Agent '${hostname}' is offline`);
      return 1;
    }
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    return 1;
  } finally {
    await client.close();
  }
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
