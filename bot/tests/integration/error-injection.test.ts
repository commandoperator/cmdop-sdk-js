/**
 * Error injection: each CMDOPClient method throws every relevant error type.
 * Verifies that handlers wrap all thrown errors as typed BotErrors
 * and never let raw errors escape to consumers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TerminalHandler } from '../../src/handlers/terminal.js';
import { AgentHandler } from '../../src/handlers/agent.js';
import { FilesHandler } from '../../src/handlers/files.js';
import { createLogger } from '../../src/core/logger.js';
import { CMDOPError, BotError } from '../../src/errors.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';

function setup() {
  const client = createMockClient();
  const logger = createLogger('error');
  const terminal = new TerminalHandler(client, logger);
  const agent = new AgentHandler(client, logger);
  const files = new FilesHandler(client, logger);
  return { client, terminal, agent, files };
}

// ─── Network / transport errors ───────────────────────────────────────────────

describe('TerminalHandler error injection', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  it('execute() throws Error → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.terminal.execute).mockRejectedValue(new Error('ECONNRESET'));
    const result = await s.terminal.handle(makeCtx({ args: ['ls'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CMDOPError);
      expect(result.error).toBeInstanceOf(BotError);
    }
  });

  it('execute() throws string → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.terminal.execute).mockRejectedValue('unknown string error');
    const result = await s.terminal.handle(makeCtx({ args: ['ls'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('getActiveSession() throws → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.terminal.getActiveSession).mockRejectedValue(new Error('timeout'));
    const result = await s.terminal.handle(makeCtx({ args: ['ls'], machine: 'srv-1' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('list() throws → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.terminal.list).mockRejectedValue(new Error('gRPC error'));
    const result = await s.terminal.handle(makeCtx({ args: ['ls'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('execute() returns exit code 127 → ok result with output', async () => {
    vi.mocked(s.client.terminal.execute).mockResolvedValue({ exitCode: 127, output: 'not found' } as never);
    const result = await s.terminal.handle(makeCtx({ args: ['badcmd'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'code') {
      expect(result.value.code).toContain('not found');
    }
  });
});

describe('AgentHandler error injection', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  it('agent.run() throws → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.agent.run).mockRejectedValue(new Error('LLM timeout'));
    const result = await s.agent.handle(makeCtx({ command: 'agent', args: ['do something'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('agent.run() returns success:false → CMDOPError', async () => {
    vi.mocked(s.client.agent.run).mockResolvedValue(
      { success: false, error: 'context limit exceeded', text: '', durationMs: 0, toolResults: [], usage: null } as never,
    );
    const result = await s.agent.handle(makeCtx({ command: 'agent', args: ['do something'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CMDOPError);
      expect(result.error.message).toContain('context limit');
    }
  });

  it('agent.setMachine() throws → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.agent.setMachine).mockRejectedValue(new Error('machine not found'));
    const result = await s.agent.handle(
      makeCtx({ command: 'agent', args: ['ls'], machine: 'bad-host' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });
});

describe('FilesHandler error injection', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  it('files.list() throws → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.files.list).mockRejectedValue(new Error('permission denied'));
    const result = await s.files.handle(makeCtx({ command: 'files', args: ['/etc'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('files.read() throws → wrapped as CMDOPError', async () => {
    vi.mocked(s.client.files.read).mockRejectedValue(new Error('file not found'));
    const result = await s.files.handle(makeCtx({ command: 'files', args: ['read', '/etc/shadow'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('files.list() returns empty dir → ok text result', async () => {
    vi.mocked(s.client.files.list).mockResolvedValue({ entries: [], totalCount: 0 } as never);
    const result = await s.files.handle(makeCtx({ command: 'files', args: ['/empty'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('empty');
    }
  });

  it('no path arg → CommandArgsError', async () => {
    const result = await s.files.handle(makeCtx({ command: 'files', args: ['read'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('unknown subcommand → CommandArgsError', async () => {
    const result = await s.files.handle(makeCtx({ command: 'files', args: ['upload', '/foo'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });
});
