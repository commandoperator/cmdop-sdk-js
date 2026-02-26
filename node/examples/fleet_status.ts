#!/usr/bin/env npx tsx
/**
 * Check status of all connected machines.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machines
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   pnpm tsx examples/fleet_status.ts
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key
 */

import { CMDOPClient } from '@cmdop/node';

async function main(): Promise<number> {
  const apiKey = process.env.CMDOP_API_KEY ?? '';

  if (!apiKey) {
    console.error('Error: Set CMDOP_API_KEY environment variable');
    return 1;
  }

  await using client = CMDOPClient.remote(apiKey);

  const { sessions, total, workspaceName } = await client.terminal.list();

  console.log(`Workspace: ${workspaceName ?? '(unknown)'}`);
  console.log(`Total machines: ${total}`);
  console.log();

  if (sessions.length === 0) {
    console.log('No connected machines');
    return 0;
  }

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);

  console.log(`${'Status'.padEnd(8)} ${'Hostname'.padEnd(30)} ${'OS'.padEnd(10)} ${'Shell'.padEnd(15)} Heartbeat`);
  console.log('-'.repeat(75));

  for (const session of sessions) {
    const status   = session.status === 'connected' ? 'ON' : 'OFF';
    const hostname = col(session.hostname ?? session.sessionId.slice(0, 28), 30);
    const os       = col(session.os ?? 'unknown', 10);
    const shell    = col((session.shell ?? 'n/a').split('/').pop() ?? 'n/a', 15);
    const hb       = session.heartbeatAgeSeconds != null ? `${session.heartbeatAgeSeconds}s` : 'n/a';

    console.log(`${status.padEnd(8)} ${hostname} ${os} ${shell} ${hb}`);
  }

  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
