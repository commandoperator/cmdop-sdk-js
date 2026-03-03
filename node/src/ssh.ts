/**
 * sshConnect — high-level interactive terminal attach (SSH-like)
 *
 * Node.js equivalent of Python SDK's ssh_connect(). Provides a full
 * interactive terminal experience: raw mode, stdin/stdout piping,
 * terminal resize handling, Ctrl+D to disconnect.
 */

import { SessionError } from '@cmdop/core';
import type { CMDOPClient } from './client';
import type { AttachStreamEvent } from './streaming/base';
import { consola as logger } from './logging';

export interface SSHConnectOptions {
  client: CMDOPClient;
  hostname: string;
  sessionId?: string;
  debug?: boolean;
  onShareRequest?: () => Promise<void>;
}

/**
 * Connect interactively to a remote terminal session (SSH-like).
 *
 * 1. Finds active session via client.terminal.getActiveSession()
 * 2. Creates an AttachStream via client.terminal.attach()
 * 3. On sessionReady: enters raw mode, attaches stdin/resize handlers
 * 4. On output: writes to stdout
 * 5. Ctrl+D: disconnects
 *
 * @returns Exit code (0 = success, 1 = error)
 *
 * @example
 * ```typescript
 * const client = CMDOPClient.remote('cmdop_live_xxx');
 * const exitCode = await sshConnect({ client, hostname: 'my-server' });
 * process.exit(exitCode);
 * ```
 */
export async function sshConnect(options: SSHConnectOptions): Promise<number> {
  const { client, hostname, debug = false, onShareRequest } = options;

  // 1. Find active session and set machine (sets x-agent-id on transport)
  logger.start(`Finding session for \`${hostname}\`...`);

  let sessionId = options.sessionId;

  if (!sessionId) {
    // setMachine resolves hostname → sessionId AND sets agent routing on transport
    try {
      const machineInfo = await client.terminal.setMachine(hostname);
      sessionId = machineInfo.sessionId;

      const displayName = machineInfo.hostname ?? sessionId;
      logger.success(`Found session: \`${displayName}\` (id: ${sessionId.slice(0, 8)}...)`);
    } catch (err) {
      if (err instanceof SessionError) {
        logger.error(`No active session for \`${hostname}\``);
        try {
          const { sessions } = await client.terminal.list();
          if (sessions.length > 0) {
            logger.info('Available machines:');
            for (const s of sessions) console.log(`  - ${s.hostname ?? s.sessionId}`);
          }
        } catch { /* ignore list errors */ }
        return 1;
      }
      throw err;
    }
  }

  // Route all gRPC calls (including connectTerminal) to this agent
  client.setSessionId(sessionId);

  // 2. Create AttachStream
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const stream = client.terminal.attach(sessionId, { cols, rows, debug });

  // 3. Setup terminal I/O handlers
  let cleanedUp = false;
  let sessionReady = false;

  const stdinHandler = (data: Buffer) => {
    if (data.length === 1 && data[0] === 0x04) {
      // Ctrl+D → disconnect
      cleanup();
      return;
    }
    if (data.length === 1 && data[0] === 0x13 && onShareRequest) {
      // Ctrl+S → create share link
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      onShareRequest().finally(() => {
        if (!cleanedUp && process.stdin.isTTY) process.stdin.setRawMode(true);
      });
      return;
    }
    stream.sendInput(data);
  };

  const resizeHandler = () => {
    stream.sendResize(process.stdout.columns || 80, process.stdout.rows || 24);
  };

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    stream.close();
    process.stdin.removeListener('data', stdinHandler);
    process.stdout.removeListener('resize', resizeHandler);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  };

  // 4. Handle stream events
  stream.on((event: AttachStreamEvent) => {
    switch (event.type) {
      case 'sessionReady':
        sessionReady = true;
        const tips = [`Use \`ccat\` for syntax-highlighted file viewing`];
        if (onShareRequest) tips.push('Press \x1b[1mCtrl+S\x1b[0m to share this session');
        logger.box(
          `Connected! Press \x1b[1mCtrl+D\x1b[0m to disconnect.\n\n${tips.map((t) => `Tip: ${t}`).join('\n')}`,
        );
        console.log('');

        // Enable raw mode and stdin
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', stdinHandler);
        process.stdout.on('resize', resizeHandler);

        // Send initial resize, then Ctrl+L to redraw shell prompt without extra blank line
        stream.sendResize(process.stdout.columns || 80, process.stdout.rows || 24);
        setTimeout(() => stream.sendInput(Buffer.from('\x0c')), 200);
        break;

      case 'output':
        process.stdout.write(event.data);
        break;

      case 'closed':
        if (debug) process.stderr.write(`[ssh] closed: ${event.reason}\n`);
        cleanup();
        break;

      case 'error':
        if (!cleanedUp) {
          const message = event.error.message;
          if (!message.includes('CANCELLED')) {
            logger.error(`Stream error: ${message}`);
          }
        }
        break;
    }
  });

  // 5. Connect (blocks until stream ends)
  await stream.connect();

  if (!sessionReady) {
    logger.error('Server closed connection before session was ready. Check API key and session ID.');
  }

  cleanup();
  console.log('\nDisconnected.');

  return sessionReady ? 0 : 1;
}
