#!/usr/bin/env npx tsx
/**
 * AI agent with Zod structured output.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machine
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   pnpm tsx examples/agent_structured.ts
 *   pnpm tsx examples/agent_structured.ts --machine my-server
 *   pnpm tsx examples/agent_structured.ts --local
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key
 *   CMDOP_MACHINE: Default target hostname
 */

import { CMDOPClient, z } from '@cmdop/node';

// Define output schema with Zod
const ServerHealthSchema = z.object({
  hostname: z.string().describe('Server hostname'),
  cpuPercent: z.number().describe('CPU usage percentage (0-100)'),
  memoryPercent: z.number().describe('Memory usage percentage (0-100)'),
  diskFreeGb: z.number().describe('Free disk space in GB'),
  issues: z.array(z.string()).describe('List of detected issues, empty if healthy'),
});

type ServerHealth = z.infer<typeof ServerHealthSchema>;

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  const isLocal  = args.includes('--local');
  const machineIdx = args.indexOf('--machine');
  const machine  = machineIdx >= 0 ? args[machineIdx + 1] : (process.env.CMDOP_MACHINE ?? '');
  const apiKey   = process.env.CMDOP_API_KEY ?? '';

  if (!isLocal && !apiKey) {
    console.error('Error: Set CMDOP_API_KEY environment variable (or use --local)');
    return 1;
  }

  if (!isLocal && !machine) {
    console.error('Error: Set CMDOP_MACHINE env or use --machine (or use --local)');
    return 1;
  }

  const client = isLocal
    ? CMDOPClient.local()
    : CMDOPClient.remote(apiKey);

  try {
    if (!isLocal && machine) {
      await client.agent.setMachine(machine);
    }

    console.log('Checking server health...\n');

    // Use extract.runSchema — dedicated RPC, more reliable than agent.run()
    const result = await client.extract.runSchema<ServerHealth>(
      'Check server health: get hostname, CPU usage %, memory usage %, free disk space in GB, and list any issues (high CPU, low memory, low disk, etc.)',
      ServerHealthSchema,
      { timeoutSeconds: 60 },
    );

    const health = result.data;

    console.log(`Host:   ${health.hostname}`);
    console.log(`CPU:    ${health.cpuPercent.toFixed(1)}%`);
    console.log(`Memory: ${health.memoryPercent.toFixed(1)}%`);
    console.log(`Disk:   ${health.diskFreeGb.toFixed(1)} GB free`);

    if (health.issues.length > 0) {
      console.log(`\nIssues (${health.issues.length}):`);
      for (const issue of health.issues) {
        console.log(`  - ${issue}`);
      }
    } else {
      console.log('\nNo issues detected ✓');
    }

    if (result.metrics) {
      console.log(`\nDuration: ${result.metrics.durationMs}ms`);
    }

    return 0;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('LLM provider') || error.message.includes('OPENROUTER')) {
        console.error('Error: LLM provider not configured on the agent.');
        console.error('Set OPENROUTER_API_KEY on the machine running the CMDOP agent.');
        return 1;
      }
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
