import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilesHandler } from '../../src/handlers/files.js';
import { createLogger } from '../../src/core/logger.js';
import { CMDOPError } from '../../src/errors.js';
import { createMockClient } from '../helpers/mock-cmdop.js';
import { makeCtx } from '../helpers/fixtures.js';

describe('FilesHandler', () => {
  let handler: FilesHandler;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
    handler = new FilesHandler(client, createLogger('error'));
  });

  it('has correct metadata', () => {
    expect(handler.name).toBe('files');
    expect(handler.requiredPermission).toBe('READ');
  });

  it('lists files when path starts with /', async () => {
    vi.mocked(client.files.list).mockResolvedValue({
      entries: [{ name: 'foo.txt', type: 'file', size: 42 }],
      totalCount: 1,
    });
    const result = await handler.handle(makeCtx({ command: 'files', args: ['/tmp'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('foo.txt');
    }
  });

  it('shows empty message for empty directory', async () => {
    vi.mocked(client.files.list).mockResolvedValue({ entries: [], totalCount: 0 });
    const result = await handler.handle(makeCtx({ args: ['/empty'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('empty');
    }
  });

  it('shows truncation hint when more entries exist', async () => {
    vi.mocked(client.files.list).mockResolvedValue({
      entries: [{ name: 'a.txt', type: 'file', size: 1 }],
      totalCount: 10,
    });
    handler = new FilesHandler(client, createLogger('error'), { maxEntries: 1 });
    const result = await handler.handle(makeCtx({ args: ['/tmp'] }));
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'text') {
      expect(result.value.text).toContain('more');
    }
  });

  it('reads file content with "read" subcommand', async () => {
    vi.mocked(client.files.read).mockResolvedValue({ content: '#!/bin/bash\necho hello' });
    const result = await handler.handle(makeCtx({ args: ['read', '/tmp/script.sh'] }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe('code');
  });

  it('reads file with "cat" alias', async () => {
    vi.mocked(client.files.read).mockResolvedValue({ content: 'hello' });
    const result = await handler.handle(makeCtx({ args: ['cat', '/etc/hostname'] }));
    expect(result.ok).toBe(true);
  });

  it('returns error for read without path', async () => {
    const result = await handler.handle(makeCtx({ args: ['read'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('COMMAND_ARGS');
  });

  it('calls setMachine when ctx.machine is set', async () => {
    await handler.handle(makeCtx({ args: ['/tmp'], machine: 'server1' }));
    expect(client.files.setMachine).toHaveBeenCalledWith('server1');
  });

  it('wraps list errors as CMDOPError', async () => {
    vi.mocked(client.files.list).mockRejectedValue(new Error('permission denied'));
    const result = await handler.handle(makeCtx({ args: ['/root'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CMDOPError);
  });
});
