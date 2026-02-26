/**
 * Integration test: DemoChannel + hub + all default handlers.
 *
 * Uses DemoChannel.injectMessage() to drive the full pipeline:
 *   user input → parseCommand → dispatcher → handler → send() → onOutput
 * No real CMDOPClient or platform SDK required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemoChannel } from '../../src/channels/demo/index.js';
import { MessageDispatcher } from '../../src/core/dispatcher.js';
import { PermissionManager, InMemoryPermissionStore } from '../../src/core/permission-manager.js';
import { createLogger } from '../../src/core/logger.js';
import { TerminalHandler } from '../../src/handlers/terminal.js';
import { AgentHandler } from '../../src/handlers/agent.js';
import { FilesHandler } from '../../src/handlers/files.js';
import { HelpHandler } from '../../src/handlers/help.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import type { OutgoingMessage } from '../../src/models/message.js';

function buildStack() {
  const client = createMockClient();
  const store = new InMemoryPermissionStore();
  const permissions = new PermissionManager(store, { adminUsers: ['admin'] });
  const logger = createLogger('error');
  const dispatcher = new MessageDispatcher(permissions, logger);

  dispatcher.register(new TerminalHandler(client, logger));
  dispatcher.register(new AgentHandler(client, logger));
  dispatcher.register(new FilesHandler(client, logger));
  dispatcher.register(new HelpHandler(client, logger, {
    getCommands: () => dispatcher.getCommandList(),
  }));

  const outputs: OutgoingMessage[] = [];
  const channel = new DemoChannel(permissions, dispatcher, logger, {
    onOutput: (_text, msg) => outputs.push(msg),
  });

  return { client, store, permissions, channel, outputs, dispatcher };
}

describe('DemoChannel integration', () => {
  let stack: ReturnType<typeof buildStack>;

  beforeEach(() => {
    stack = buildStack();
  });

  // ─── /exec ──────────────────────────────────────────────────────────────────

  it('/exec returns code output for admin user', async () => {
    vi.mocked(stack.client.terminal.execute).mockResolvedValue(
      { exitCode: 0, output: 'total 8\ndrwxr-xr-x' } as never,
    );
    await stack.channel.injectMessage({ userId: 'admin', text: '/exec ls -la' });
    expect(stack.outputs).toHaveLength(1);
    expect(stack.outputs[0]?.type).toBe('code');
    if (stack.outputs[0]?.type === 'code') {
      expect(stack.outputs[0].code).toContain('total 8');
    }
  });

  it('/exec returns permission error for user with NONE level', async () => {
    await stack.channel.injectMessage({ userId: 'nobody', text: '/exec ls' });
    expect(stack.outputs[0]?.type).toBe('error');
  });

  it('/exec with no args returns error message', async () => {
    await stack.channel.injectMessage({ userId: 'admin', text: '/exec' });
    expect(stack.outputs[0]?.type).toBe('error');
  });

  it('/exec exit code 1 still returns output', async () => {
    vi.mocked(stack.client.terminal.execute).mockResolvedValue(
      { exitCode: 1, output: 'command not found' } as never,
    );
    await stack.channel.injectMessage({ userId: 'admin', text: '/exec badcmd' });
    expect(stack.outputs[0]?.type).toBe('code');
    if (stack.outputs[0]?.type === 'code') {
      expect(stack.outputs[0].code).toContain('command not found');
    }
  });

  // ─── /agent ─────────────────────────────────────────────────────────────────

  it('/agent returns text response for admin user', async () => {
    vi.mocked(stack.client.agent.run).mockResolvedValue(
      { success: true, text: 'Done! Created 3 files.', durationMs: 200, toolResults: [], usage: null } as never,
    );
    await stack.channel.injectMessage({ userId: 'admin', text: '/agent create 3 files' });
    expect(stack.outputs[0]?.type).toBe('text');
    if (stack.outputs[0]?.type === 'text') {
      expect(stack.outputs[0].text).toContain('Done');
    }
  });

  it('/agent with no prompt returns error', async () => {
    await stack.channel.injectMessage({ userId: 'admin', text: '/agent' });
    expect(stack.outputs[0]?.type).toBe('error');
  });

  // ─── /files ─────────────────────────────────────────────────────────────────

  it('/files lists directory for READ user', async () => {
    await stack.store.setLevel('reader', 'READ');
    vi.mocked(stack.client.files.list).mockResolvedValue({
      entries: [
        { name: 'README.md', type: 'file', size: 512 },
        { name: 'src', type: 'directory', size: 0 },
      ],
      totalCount: 2,
    } as never);
    await stack.channel.injectMessage({ userId: 'reader', text: '/files /home' });
    expect(stack.outputs[0]?.type).toBe('text');
    if (stack.outputs[0]?.type === 'text') {
      expect(stack.outputs[0].text).toContain('README.md');
    }
  });

  it('/files denied for NONE user', async () => {
    await stack.channel.injectMessage({ userId: 'nobody', text: '/files /home' });
    expect(stack.outputs[0]?.type).toBe('error');
  });

  // ─── /help ──────────────────────────────────────────────────────────────────

  it('/help returns command list for any user', async () => {
    await stack.channel.injectMessage({ userId: 'nobody', text: '/help' });
    expect(stack.outputs[0]?.type).toBe('text');
    if (stack.outputs[0]?.type === 'text') {
      expect(stack.outputs[0].text).toContain('exec');
      expect(stack.outputs[0].text).toContain('help');
    }
  });

  // ─── unknown command ─────────────────────────────────────────────────────────

  it('unknown command returns error', async () => {
    await stack.channel.injectMessage({ userId: 'admin', text: '/unknowncmd' });
    expect(stack.outputs[0]?.type).toBe('error');
  });

  it('non-command text is silently ignored', async () => {
    await stack.channel.injectMessage({ userId: 'admin', text: 'just a chat message' });
    expect(stack.outputs).toHaveLength(0);
  });

  // ─── channel lifecycle ───────────────────────────────────────────────────────

  it('start and stop do not throw', async () => {
    await expect(stack.channel.start()).resolves.toBeUndefined();
    await expect(stack.channel.stop()).resolves.toBeUndefined();
  });

  it('injectMessage supports custom userId', async () => {
    await stack.store.setLevel('custom-user', 'READ');
    await stack.channel.injectMessage({ userId: 'custom-user', text: '/help' });
    expect(stack.outputs).toHaveLength(1);
  });
});
