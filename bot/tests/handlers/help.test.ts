import { describe, it, expect, beforeEach } from 'vitest';
import { HelpHandler } from '../../src/handlers/help.js';
import { createLogger } from '../../src/core/logger.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';

describe('HelpHandler', () => {
  let handler: HelpHandler;

  beforeEach(() => {
    const client = createMockClient();
    handler = new HelpHandler(client, createLogger('error'), {
      getCommands: () => [
        { name: 'exec', description: 'Run shell command', usage: '/exec <cmd>', requiredPermission: 'EXECUTE' },
        { name: 'help', description: 'Show help', usage: '/help', requiredPermission: 'NONE' },
      ],
    });
  });

  it('has correct metadata', () => {
    expect(handler.name).toBe('help');
    expect(handler.requiredPermission).toBe('NONE');
  });

  it('returns text message with command list', async () => {
    const result = await handler.handle(makeCtx({ command: 'help', args: [] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('text');
      if (result.value.type === 'text') {
        expect(result.value.text).toContain('/exec');
        expect(result.value.text).toContain('/help');
        expect(result.value.text).toContain('EXECUTE');
      }
    }
  });

  it('returns text even with empty command list', async () => {
    const emptyHandler = new HelpHandler(createMockClient(), createLogger('error'), {
      getCommands: () => [],
    });
    const result = await emptyHandler.handle(makeCtx({ command: 'help', args: [] }));
    expect(result.ok).toBe(true);
  });
});
