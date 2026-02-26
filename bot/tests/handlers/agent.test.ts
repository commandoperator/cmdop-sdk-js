import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentHandler } from '../../src/handlers/agent.js';
import { createLogger } from '../../src/core/logger.js';
import { CMDOPError } from '../../src/errors.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';

describe('AgentHandler', () => {
  let handler: AgentHandler;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
    handler = new AgentHandler(client, createLogger('error'));
  });

  it('has correct metadata', () => {
    expect(handler.name).toBe('agent');
    expect(handler.requiredPermission).toBe('EXECUTE');
  });

  it('returns text response on success', async () => {
    vi.mocked(client.agent.run).mockResolvedValue({ success: true, text: 'The answer is 42', durationMs: 50, toolResults: [], usage: null });
    const result = await handler.handle(makeCtx({ command: 'agent', args: ['what', 'is', '6x7'] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('text');
      if (result.value.type === 'text') expect(result.value.text).toContain('42');
    }
  });

  it('returns error when no prompt provided', async () => {
    const result = await handler.handle(makeCtx({ command: 'agent', args: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('returns CMDOPError when agent.run returns success:false', async () => {
    vi.mocked(client.agent.run).mockResolvedValue({ success: false, text: '', error: 'no LLM', durationMs: 0, toolResults: [], usage: null });
    const result = await handler.handle(makeCtx({ args: ['hello'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  it('calls setMachine when ctx.machine is set', async () => {
    await handler.handle(makeCtx({ args: ['list files'], machine: 'prod-server' }));
    expect(client.agent.setMachine).toHaveBeenCalledWith('prod-server');
  });

  it('truncates long response', async () => {
    vi.mocked(client.agent.run).mockResolvedValue({ success: true, text: 'x'.repeat(5000), durationMs: 0, toolResults: [], usage: null });
    handler = new AgentHandler(client, createLogger('error'), { maxOutputLength: 100 });
    const result = await handler.handle(makeCtx({ args: ['tell me a story'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('truncated');
    }
  });

  it('wraps thrown errors as CMDOPError', async () => {
    vi.mocked(client.agent.run).mockRejectedValue(new Error('grpc error'));
    const result = await handler.handle(makeCtx({ args: ['help'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });
});
