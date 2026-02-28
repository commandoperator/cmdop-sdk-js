#!/usr/bin/env npx tsx
/**
 * Skills — list, show, and run skills on a remote machine.
 *
 * Prerequisites:
 *   1. CMDOP agent running on target machine
 *   2. pnpm add @cmdop/node
 *
 * Usage:
 *   pnpm tsx examples/skills.ts                          # list all skills
 *   pnpm tsx examples/skills.ts show code-review         # show skill details
 *   pnpm tsx examples/skills.ts run code-review "Review my code"
 *   pnpm tsx examples/skills.ts --machine my-server      # target a machine
 *   pnpm tsx examples/skills.ts --local                  # use local IPC
 *
 * Environment:
 *   CMDOP_API_KEY: Your CMDOP API key
 *   CMDOP_MACHINE: Default target hostname
 */

import { CMDOPClient } from '@cmdop/node';

async function main(): Promise<number> {
  const rawArgs = process.argv.slice(2);

  const isLocal    = rawArgs.includes('--local');
  const machineIdx = rawArgs.indexOf('--machine');
  const machine    = machineIdx >= 0 ? rawArgs[machineIdx + 1] : (process.env.CMDOP_MACHINE ?? '');
  const apiKey     = process.env.CMDOP_API_KEY ?? '';

  // Strip flags to get positional args
  const args = rawArgs.filter((a, i, arr) => {
    if (a === '--local') return false;
    if (a === '--machine') return false;
    if (i > 0 && arr[i - 1] === '--machine') return false;
    return true;
  });

  const subcommand = args[0] ?? 'list';

  if (!isLocal && !apiKey) {
    console.error('Error: Set CMDOP_API_KEY environment variable (or use --local)');
    return 1;
  }

  const client = isLocal
    ? CMDOPClient.local()
    : CMDOPClient.remote(apiKey);

  try {
    if (!isLocal && machine) {
      await client.skills.setMachine(machine);
    }

    switch (subcommand) {
      case 'list': {
        const skills = await client.skills.list();
        if (skills.length === 0) {
          console.log('No skills installed.');
        } else {
          console.log(`Found ${skills.length} skill(s):\n`);
          for (const s of skills) {
            const meta = [s.origin, s.version].filter(Boolean).join(', ');
            console.log(`  ${s.name}${meta ? ` (${meta})` : ''}`);
            if (s.description) console.log(`    ${s.description}`);
          }
        }
        break;
      }

      case 'show': {
        const name = args[1];
        if (!name) {
          console.error('Usage: skills.ts show <skill-name>');
          return 1;
        }

        const detail = await client.skills.show(name);
        if (!detail.found) {
          console.error(`Skill "${name}" not found`);
          return 1;
        }

        if (detail.info) {
          console.log(`Name:        ${detail.info.name}`);
          if (detail.info.description) console.log(`Description: ${detail.info.description}`);
          if (detail.info.author)      console.log(`Author:      ${detail.info.author}`);
          if (detail.info.version)     console.log(`Version:     ${detail.info.version}`);
          if (detail.info.origin)      console.log(`Origin:      ${detail.info.origin}`);
          if (detail.info.model)       console.log(`Model:       ${detail.info.model}`);
          if (detail.info.requiredBins.length > 0)
            console.log(`Requires:    ${detail.info.requiredBins.join(', ')}`);
          if (detail.info.requiredEnv.length > 0)
            console.log(`Env vars:    ${detail.info.requiredEnv.join(', ')}`);
        }
        if (detail.source) console.log(`Source:      ${detail.source}`);
        if (detail.content) {
          console.log(`\n--- Content ---\n${detail.content}`);
        }
        break;
      }

      case 'run': {
        const name = args[1];
        const prompt = args.slice(2).join(' ');
        if (!name || !prompt) {
          console.error('Usage: skills.ts run <skill-name> <prompt>');
          return 1;
        }

        console.log(`Running skill "${name}"...\n`);
        const result = await client.skills.run(name, prompt);
        console.log(result.text);
        console.log(`\nDuration: ${result.durationMs}ms`);
        if (result.usage) console.log(`Tokens: ${result.usage.totalTokens}`);
        if (result.toolResults.length > 0) console.log(`Tools used: ${result.toolResults.length}`);
        break;
      }

      default:
        console.error(`Unknown subcommand: ${subcommand}`);
        console.error('Usage: skills.ts [list | show <name> | run <name> <prompt>]');
        return 1;
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
