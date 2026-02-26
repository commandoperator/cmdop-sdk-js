import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TerminalHandler } from '../../src/handlers/terminal.js';
import { createLogger } from '../../src/core/logger.js';
import { CMDOPError } from '../../src/errors.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';

describe('TerminalHandler', () => {
  let handler: TerminalHandler;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
    handler = new TerminalHandler(client, createLogger('error'));
  });

  it('has correct metadata', () => {
    expect(handler.name).toBe('exec');
    expect(handler.requiredPermission).toBe('EXECUTE');
    expect(handler.usage).toContain('/exec');
  });

  it('returns code output on success', async () => {
    vi.mocked(client.terminal.execute).mockResolvedValue({ exitCode: 0, output: 'hello world' } as never);
    const result = await handler.handle(makeCtx({ args: ['echo', 'hello', 'world'] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('code');
      if (result.value.type === 'code') {
        expect(result.value.code).toContain('hello world');
      }
    }
  });

  it('returns error when no args', async () => {
    const result = await handler.handle(makeCtx({ args: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('uses machine session when ctx.machine is set', async () => {
    vi.mocked(client.terminal.getActiveSession).mockResolvedValue({ sessionId: 'machine-sess', hostname: 'my-server' });
    const result = await handler.handle(makeCtx({ args: ['whoami'], machine: 'my-server' }));
    expect(client.terminal.getActiveSession).toHaveBeenCalledWith({ hostname: 'my-server' });
    expect(result.ok).toBe(true);
  });

  it('returns error when machine has no active session', async () => {
    vi.mocked(client.terminal.getActiveSession).mockResolvedValue(null);
    const result = await handler.handle(makeCtx({ args: ['ls'], machine: 'offline-server' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('returns error when no sessions exist', async () => {
    vi.mocked(client.terminal.list).mockResolvedValue({ sessions: [], workspaceName: null });
    const result = await handler.handle(makeCtx({ args: ['ls'] }));
    expect(result.ok).toBe(false);
  });

  it('truncates long output', async () => {
    const longOutput = 'x'.repeat(5000);
    vi.mocked(client.terminal.execute).mockResolvedValue({ exitCode: 0, output: longOutput } as never);
    handler = new TerminalHandler(client, createLogger('error'), { maxOutputLength: 100 });
    const result = await handler.handle(makeCtx({ args: ['cat', 'bigfile'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'code') {
      expect(result.value.code).toContain('truncated');
      expect(result.value.code.length).toBeLessThan(200);
    }
  });

  it('wraps thrown errors as CMDOPError', async () => {
    vi.mocked(client.terminal.execute).mockRejectedValue(new Error('network error'));
    const result = await handler.handle(makeCtx({ args: ['ls'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });
});
