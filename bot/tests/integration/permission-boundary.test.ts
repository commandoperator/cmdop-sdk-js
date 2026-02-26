/**
 * Permission boundary test: all 5 levels × all 4 handlers.
 *
 * Matrix:
 *             NONE  READ  EXECUTE  FILES  ADMIN
 *  /help        ✓     ✓      ✓       ✓      ✓    (NONE required)
 *  /files       ✗     ✓      ✓       ✓      ✓    (READ required)
 *  /exec        ✗     ✗      ✓       ✓      ✓    (EXECUTE required)
 *  /agent       ✗     ✗      ✓       ✓      ✓    (EXECUTE required)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageDispatcher } from '../../src/core/dispatcher.js';
import { PermissionManager, InMemoryPermissionStore } from '../../src/core/permission-manager.js';
import { createLogger } from '../../src/core/logger.js';
import { TerminalHandler } from '../../src/handlers/terminal.js';
import { AgentHandler } from '../../src/handlers/agent.js';
import { FilesHandler } from '../../src/handlers/files.js';
import { HelpHandler } from '../../src/handlers/help.js';
import { PermissionDeniedError } from '../../src/errors.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';
import type { PermissionLevel } from '../../src/models/user.js';

function buildDispatcher() {
  const client = createMockClient();
  const store = new InMemoryPermissionStore();
  const permissions = new PermissionManager(store);
  const logger = createLogger('error');
  const dispatcher = new MessageDispatcher(permissions, logger);

  dispatcher.register(new TerminalHandler(client, logger));
  dispatcher.register(new AgentHandler(client, logger));
  dispatcher.register(new FilesHandler(client, logger));
  dispatcher.register(new HelpHandler(client, logger, {
    getCommands: () => dispatcher.getCommandList(),
  }));

  return { dispatcher, store, client };
}

const LEVELS: PermissionLevel[] = ['NONE', 'READ', 'EXECUTE', 'FILES', 'ADMIN'];

// Expected access: true = allowed, false = denied
const ACCESS_MATRIX: Record<string, Record<PermissionLevel, boolean>> = {
  help:  { NONE: true,  READ: true,  EXECUTE: true,  FILES: true,  ADMIN: true  },
  files: { NONE: false, READ: true,  EXECUTE: true,  FILES: true,  ADMIN: true  },
  exec:  { NONE: false, READ: false, EXECUTE: true,  FILES: true,  ADMIN: true  },
  agent: { NONE: false, READ: false, EXECUTE: true,  FILES: true,  ADMIN: true  },
};

describe('Permission boundary matrix', () => {
  let dispatcher: MessageDispatcher;
  let store: InMemoryPermissionStore;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    ({ dispatcher, store, client } = buildDispatcher());

    // Stub all client methods to return valid values
    vi.mocked(client.terminal.execute).mockResolvedValue({ exitCode: 0, output: 'ok' } as never);
    vi.mocked(client.agent.run).mockResolvedValue(
      { success: true, text: 'done', durationMs: 10, toolResults: [], usage: null } as never,
    );
    vi.mocked(client.files.list).mockResolvedValue({
      entries: [{ name: 'a.txt', type: 'file', size: 1 }],
      totalCount: 1,
    } as never);
  });

  for (const [command, levelMap] of Object.entries(ACCESS_MATRIX)) {
    for (const level of LEVELS) {
      const allowed = levelMap[level];
      it(`/${command} with ${level} → ${allowed ? 'allowed' : 'denied'}`, async () => {
        const userId = `user-${level}`;
        if (level !== 'NONE') await store.setLevel(userId, level);

        const args = command === 'exec' ? ['ls']
          : command === 'agent' ? ['list files']
          : command === 'files' ? ['/tmp']
          : [];

        const ctx = makeCtx({ userId, command, args });

        if (allowed) {
          const result = await dispatcher.dispatch(ctx);
          // Handler ran — result may be ok or err (args/machine), but NOT a permission error
          if (!result.ok) {
            expect(result.error).not.toBeInstanceOf(PermissionDeniedError);
          }
        } else {
          await expect(dispatcher.dispatch(ctx)).rejects.toThrow(PermissionDeniedError);
        }
      });
    }
  }
});
