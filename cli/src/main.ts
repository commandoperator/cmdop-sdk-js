#!/usr/bin/env bun
/**
 * cmdok CLI — standalone binary for remote agent interaction.
 *
 * Compiled with: bun build --compile
 * No Node.js/npm required to run.
 */

import { consola as logger } from 'consola';
import { cmdSSH } from './commands/ssh.js';
import { cmdExec } from './commands/exec.js';
import { cmdAgent } from './commands/agent.js';
import { cmdShare } from './commands/share.js';
import { cmdLogin } from './commands/login.js';
import { loadConfig, deleteConfig, maskApiKey, getConfigPath } from './config.js';
import { resolveApiKey, resolveHostname } from './resolve.js';
import { CLI_NAME } from './constants.js';

// Build-time constants (injected via --define)
declare const CLI_VERSION: string;
declare const CLI_COMMIT: string;
declare const CLI_BUILD_DATE: string;

const VERSION = typeof CLI_VERSION !== 'undefined' ? CLI_VERSION : 'dev';
const COMMIT = typeof CLI_COMMIT !== 'undefined' ? CLI_COMMIT : 'unknown';
const BUILD_DATE = typeof CLI_BUILD_DATE !== 'undefined' ? CLI_BUILD_DATE : 'unknown';

// ─────────────────────────────────────────────────────────────────────
// Arg parsing
// ─────────────────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string;
  hostname: string;
  extra: string; // command text for exec, prompt for agent
  apiKey: string;
  server?: string;
  timeout: number;
  debug: boolean;
}

function printUsage(): void {
  console.log(`
${CLI_NAME} ${VERSION}

Usage:
  ${CLI_NAME} ssh [hostname]                Interactive SSH session
  ${CLI_NAME} exec [hostname] <command>    Execute command remotely
  ${CLI_NAME} agent [hostname] <prompt>    Run AI agent with prompt
  ${CLI_NAME} share [hostname]             Create a share link for a machine
  ${CLI_NAME} login                        Configure API key
  ${CLI_NAME} logout                       Remove saved configuration
  ${CLI_NAME} config                       Show current configuration
  ${CLI_NAME} version                      Print version info

Options:
  --api-key, -k <key>     API key (default: CMDOP_API_KEY env)
  --server, -s <addr>     gRPC server override
  --timeout, -t <sec>     Timeout in seconds (default: 60)
  --debug, -d             Enable debug logging

Environment:
  CMDOP_API_KEY            API key for remote connections
  CMDOP_GRPC_SERVER        Override gRPC server address

Examples:
  ${CLI_NAME} ssh my-server
  ${CLI_NAME} exec my-server "ls -la /tmp"
  ${CLI_NAME} agent my-server "List running processes"
  ${CLI_NAME} login
`.trim());
}

function parseArgs(): ParsedArgs | null {
  const raw = process.argv.slice(2);

  if (raw.length === 0 || raw.includes('--help') || raw.includes('-h')) {
    printUsage();
    return null;
  }

  let command = '';
  let hostname = '';
  let extra = '';
  let apiKey = '';
  let server: string | undefined;
  let timeout = 60;
  let debug = false;

  const positional: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i]!;

    if (arg === '--api-key' || arg === '-k') { apiKey = raw[++i] ?? ''; continue; }
    if (arg === '--server' || arg === '-s') { server = raw[++i]; continue; }
    if (arg === '--timeout' || arg === '-t') { timeout = Number(raw[++i]); continue; }
    if (arg === '--debug' || arg === '-d') { debug = true; continue; }

    positional.push(arg);
  }

  command = positional[0] ?? '';
  hostname = positional[1] ?? '';
  extra = positional.slice(2).join(' ');

  if (command === 'version') {
    console.log(`${CLI_NAME} ${VERSION} (${COMMIT}) built ${BUILD_DATE}`);
    return null;
  }

  return { command, hostname, extra, apiKey, server, timeout, debug };
}

// ─────────────────────────────────────────────────────────────────────
// Standalone commands
// ─────────────────────────────────────────────────────────────────────

function cmdConfig(): number {
  const config = loadConfig();

  if (!config.apiKey) {
    logger.info(`No configuration found. Run \`${CLI_NAME} login\` to configure.`);
    return 0;
  }

  logger.box([
    `API Key:       ${maskApiKey(config.apiKey)}`,
    `Recent hosts:  ${config.recentHosts.length > 0 ? config.recentHosts.join(', ') : '(none)'}`,
    `Config file:   ${getConfigPath()}`,
  ].join('\n'));

  return 0;
}

function cmdLogout(): number {
  deleteConfig();
  logger.success('Configuration removed.');
  return 0;
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const args = parseArgs();
  if (!args) return 0;

  const { command, hostname, extra, server, timeout, debug } = args;

  // Standalone commands (no apiKey/hostname needed)
  if (command === 'login') return cmdLogin();
  if (command === 'logout') return cmdLogout();
  if (command === 'config') return cmdConfig();

  // Resolve API key (flag → env → config → interactive)
  const apiKey = await resolveApiKey(args.apiKey);
  if (!apiKey) return 1;

  // Resolve server: flag → env → config → default
  const resolvedServer = server
    || process.env.CMDOP_GRPC_SERVER
    || loadConfig().server;

  switch (command) {
    case 'ssh': {
      const resolved = await resolveHostname(hostname, apiKey);
      if (!resolved) return 1;
      return cmdSSH({ apiKey, hostname: resolved.hostname, machineId: resolved.machineId, server: resolvedServer, debug });
    }

    case 'exec': {
      // hostname optional: if not provided → picker, command from extra or hostname slot
      let execHost = hostname;
      let execCommand = extra;
      if (!extra && hostname) {
        // Only command provided, no hostname → show picker
        execCommand = hostname;
        execHost = '';
      }
      const resolvedExec = await resolveHostname(execHost, apiKey);
      if (!resolvedExec) return 1;
      if (!execCommand) {
        console.error(`Error: command required.\n\n  Usage: ${CLI_NAME} exec [hostname] <command>\n`);
        return 1;
      }
      return cmdExec({ apiKey, hostname: resolvedExec.hostname, command: execCommand, server: resolvedServer, timeout, debug });
    }

    case 'agent': {
      // hostname optional: if not provided → picker, prompt from extra or hostname slot
      let agentHost = hostname;
      let agentPrompt = extra;
      if (!extra && hostname) {
        // Only prompt provided, no hostname → show picker
        agentPrompt = hostname;
        agentHost = '';
      }
      const resolvedAgent = await resolveHostname(agentHost, apiKey);
      if (!resolvedAgent) return 1;
      if (!agentPrompt) {
        console.error(`Error: prompt required.\n\n  Usage: ${CLI_NAME} agent [hostname] <prompt>\n`);
        return 1;
      }
      return cmdAgent({ apiKey, hostname: resolvedAgent.hostname, prompt: agentPrompt, server: resolvedServer, timeout, debug });
    }

    case 'share': {
      const resolvedShare = await resolveHostname(hostname, apiKey);
      if (!resolvedShare) return 1;
      return cmdShare({ apiKey, hostname: resolvedShare.hostname, machineId: resolvedShare.machineId, debug });
    }

    default:
      console.error(`Unknown command: ${command}\n`);
      printUsage();
      return 1;
  }
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
