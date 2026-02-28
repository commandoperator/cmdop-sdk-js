import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillsHandler } from '../../src/handlers/skills.js';
import { createLogger } from '../../src/core/logger.js';
import { CMDOPError } from '../../src/errors.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';

describe('SkillsHandler', () => {
  let handler: SkillsHandler;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
    handler = new SkillsHandler(client, createLogger('error'));
  });

  it('has correct metadata', () => {
    expect(handler.name).toBe('skills');
    expect(handler.requiredPermission).toBe('EXECUTE');
    expect(handler.usage).toContain('/skills');
  });

  // ── No subcommand ──────────────────────────────────────────────────────

  it('returns CommandArgsError when no subcommand', async () => {
    const result = await handler.handle(makeCtx({ command: 'skills', args: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('returns CommandArgsError for unknown subcommand', async () => {
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['unknown'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  // ── list ───────────────────────────────────────────────────────────────

  it('/skills list returns skill names', async () => {
    vi.mocked(client.skills.list).mockResolvedValue([
      { name: 'code-review', description: 'Review code', author: '', version: '1.0.0', model: '', origin: 'builtin', requiredBins: [], requiredEnv: [] },
      { name: 'summarize', description: 'Summarize text', author: '', version: '1.0.0', model: '', origin: 'global', requiredBins: [], requiredEnv: [] },
    ]);
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['list'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('code-review');
      expect(result.value.text).toContain('summarize');
    }
  });

  it('/skills list returns empty message when no skills', async () => {
    vi.mocked(client.skills.list).mockResolvedValue([]);
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['list'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('No skills installed');
    }
  });

  // ── show ───────────────────────────────────────────────────────────────

  it('/skills show returns skill detail', async () => {
    vi.mocked(client.skills.show).mockResolvedValue({
      found: true,
      info: { name: 'code-review', description: 'Review code', author: 'cmdop', version: '1.0.0', model: '', origin: 'builtin', requiredBins: [], requiredEnv: [] },
      content: '# Code Review\nReview the code.',
      source: '/skills/code-review/SKILL.md',
    });
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['show', 'code-review'] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('code');
      if (result.value.type === 'code') {
        expect(result.value.code).toContain('code-review');
        expect(result.value.code).toContain('cmdop');
      }
    }
  });

  it('/skills show without name returns CommandArgsError', async () => {
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['show'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('/skills show returns error when skill not found', async () => {
    vi.mocked(client.skills.show).mockResolvedValue({
      found: false,
      content: '',
      source: '',
      error: 'Skill "nope" not found',
    });
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['show', 'nope'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  // ── run ────────────────────────────────────────────────────────────────

  it('/skills run returns result text', async () => {
    vi.mocked(client.skills.run).mockResolvedValue({
      requestId: 'req-1',
      success: true,
      text: 'Code looks good!',
      toolResults: [],
      durationMs: 500,
    });
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['run', 'code-review', 'review', 'this', 'file'] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('code');
      if (result.value.type === 'code') {
        expect(result.value.code).toContain('Code looks good!');
      }
    }
    expect(client.skills.run).toHaveBeenCalledWith('code-review', 'review this file');
  });

  it('/skills run without name returns CommandArgsError', async () => {
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['run'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('/skills run without prompt returns CommandArgsError', async () => {
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['run', 'code-review'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('/skills run wraps thrown errors as CMDOPError', async () => {
    vi.mocked(client.skills.run).mockRejectedValue(new Error('grpc error'));
    const result = await handler.handle(makeCtx({ command: 'skills', args: ['run', 'code-review', 'do stuff'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });

  // ── Machine routing ────────────────────────────────────────────────────

  it('calls setMachine when ctx.machine is set', async () => {
    vi.mocked(client.skills.list).mockResolvedValue([]);
    await handler.handle(makeCtx({ args: ['list'], machine: 'prod-server' }));
    expect(client.skills.setMachine).toHaveBeenCalledWith('prod-server');
  });
});
