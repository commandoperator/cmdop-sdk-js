#!/usr/bin/env npx tsx
/**
 * File operations on local or remote machines.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machine
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   # Local agent
 *   pnpm tsx examples/file_operations.ts list /tmp
 *   pnpm tsx examples/file_operations.ts read /etc/hostname
 *   pnpm tsx examples/file_operations.ts write /tmp/test.txt "Hello World"
 *
 *   # Remote agent
 *   pnpm tsx examples/file_operations.ts list /var/log --remote
 *   pnpm tsx examples/file_operations.ts read /etc/hostname --remote --machine my-server
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key (for --remote)
 *   CMDOP_MACHINE: Default target hostname (for --remote)
 */

import { CMDOPClient } from '@cmdop/node';

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  const operation = args[0] as 'list' | 'read' | 'write' | undefined;
  const filePath  = args[1];
  const content   = args[2];

  const isRemote  = args.includes('--remote');
  const machineIdx = args.indexOf('--machine');
  const machine   = machineIdx >= 0 ? args[machineIdx + 1] : (process.env.CMDOP_MACHINE ?? '');
  const apiKey    = process.env.CMDOP_API_KEY ?? '';

  if (!operation || !filePath) {
    console.error('Usage: file_operations.ts <list|read|write> <path> [content] [--remote] [--machine <host>]');
    return 1;
  }

  if (isRemote && !apiKey) {
    console.error('Error: Set CMDOP_API_KEY for remote mode');
    return 1;
  }

  const client = isRemote
    ? CMDOPClient.remote(apiKey)
    : CMDOPClient.local();

  try {
    if (isRemote && machine) {
      await client.files.setMachine(machine);
    }

    switch (operation) {
      case 'list': {
        const result = await client.files.list(filePath, { pageSize: 100 });
        console.log(`${'Type'.padEnd(5)} ${'Size'.padEnd(12)} Name`);
        console.log('-'.repeat(50));
        for (const entry of result.entries) {
          const type = entry.type === 'directory' ? 'DIR' : 'FILE';
          const size = entry.type !== 'directory' ? entry.size.toLocaleString() : '-';
          console.log(`${type.padEnd(5)} ${size.padEnd(12)} ${entry.name}`);
        }
        console.log(`\n${result.entries.length} entries`);
        break;
      }

      case 'read': {
        const result = await client.files.read(filePath);
        process.stdout.write(result.content.toString('utf-8'));
        break;
      }

      case 'write': {
        if (!content) {
          console.error('Error: content required for write operation');
          return 1;
        }
        await client.files.write(filePath, content);
        console.log(`Written to ${filePath}`);
        break;
      }

      default:
        console.error(`Unknown operation: ${operation}`);
        return 1;
    }

    return 0;
  } catch (error) {
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
