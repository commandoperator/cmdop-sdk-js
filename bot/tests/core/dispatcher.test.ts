import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageDispatcher } from '../../src/core/dispatcher.js';
import { PermissionManager, InMemoryPermissionStore } from '../../src/core/permission-manager.js';
import { createLogger } from '../../src/core/logger.js';
import { CommandNotFoundError, PermissionDeniedError } from '../../src/errors.js';
import type { HandlerProtocol, HandlerResult } from '../../src/core/types.js';
import type { CommandContext } from '../../src/models/command.js';
import { makeCtx } from '../helpers/fixtures.js';

function makeHandler(name: string, permission = 'NONE' as const, result: HandlerResult = { ok: true, value: { type: 'text', text: 'ok' } }): HandlerProtocol {
  return {
    name,
    description: `Handler ${name}`,
    usage: `/${name}`,
    requiredPermission: permission,
    handle: vi.fn().mockResolvedValue(result),
  };
}

describe('MessageDispatcher', () => {
  let dispatcher: MessageDispatcher;
  let permissions: PermissionManager;

  beforeEach(() => {
    permissions = new PermissionManager(new InMemoryPermissionStore(), { adminUsers: ['admin'] });
    dispatcher = new MessageDispatcher(permissions, createLogger('error'));
  });

  it('dispatches to registered handler', async () => {
    const handler = makeHandler('exec');
    dispatcher.register(handler);

    const result = await dispatcher.dispatch(makeCtx({ command: 'exec', userId: 'admin' }));
    expect(result.ok).toBe(true);
    expect(handler.handle).toHaveBeenCalledOnce();
  });

  it('returns CommandNotFoundError for unknown command', async () => {
    const result = await dispatcher.dispatch(makeCtx({ command: 'unknown', userId: 'admin' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CommandNotFoundError);
    }
  });

  it('throws PermissionDeniedError when user lacks permission', async () => {
    dispatcher.register(makeHandler('exec', 'EXECUTE'));
    await expect(
      dispatcher.dispatch(makeCtx({ command: 'exec', userId: 'nobody' })),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it('passes permission check for admin', async () => {
    dispatcher.register(makeHandler('exec', 'ADMIN'));
    const result = await dispatcher.dispatch(makeCtx({ command: 'exec', userId: 'admin' }));
    expect(result.ok).toBe(true);
  });

  it('hasCommand returns true for registered command', () => {
    dispatcher.register(makeHandler('help'));
    expect(dispatcher.hasCommand('help')).toBe(true);
    expect(dispatcher.hasCommand('missing')).toBe(false);
  });

  it('getCommandList returns all registered commands', () => {
    dispatcher.register(makeHandler('exec', 'EXECUTE'));
    dispatcher.register(makeHandler('help', 'NONE'));
    const list = dispatcher.getCommandList();
    expect(list.length).toBe(2);
    expect(list.map((c) => c.name)).toContain('exec');
  });

  it('handler result is forwarded', async () => {
    const errResult: HandlerResult = { ok: false, error: new CommandNotFoundError('exec') };
    dispatcher.register(makeHandler('fail', 'NONE', errResult));
    const result = await dispatcher.dispatch(makeCtx({ command: 'fail', userId: 'admin' }));
    expect(result.ok).toBe(false);
  });
});
