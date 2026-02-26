import { vi } from 'vitest';
import type { CMDOPClient } from '@cmdop/node';

export function createMockClient(): CMDOPClient {
  return {
    terminal: {
      create: vi.fn().mockResolvedValue({ sessionId: 'sess-001' }),
      execute: vi.fn().mockResolvedValue({ exitCode: 0, output: 'hello' }),
      close: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ sessions: [{ sessionId: 'sess-001', hostname: 'test-host', status: 'online' }], workspaceName: null }),
      getActiveSession: vi.fn().mockResolvedValue({ sessionId: 'sess-001', hostname: 'test-host' }),
      getHistory: vi.fn().mockResolvedValue({ commands: [], total: 0 }),
      getStatus: vi.fn().mockResolvedValue({ status: 'online', commandsCount: 0 }),
      setMachine: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue({ [Symbol.asyncIterator]: vi.fn() }),
    },
    files: {
      list: vi.fn().mockResolvedValue({ entries: [{ name: 'file.txt', type: 'file', size: 100 }], totalCount: 1 }),
      read: vi.fn().mockResolvedValue({ content: 'file content' }),
      write: vi.fn().mockResolvedValue({ bytesWritten: 12 }),
      stat: vi.fn().mockResolvedValue({ name: 'file.txt', size: 100, type: 'file' }),
      delete: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
      setMachine: vi.fn().mockResolvedValue(undefined),
    },
    agent: {
      run: vi.fn().mockResolvedValue({ success: true, text: 'agent response', durationMs: 100, toolResults: [], usage: null }),
      stream: vi.fn().mockReturnValue({ on: vi.fn(), start: vi.fn().mockResolvedValue({ success: true, text: '', durationMs: 0 }) }),
      setMachine: vi.fn().mockResolvedValue(undefined),
    },
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, version: '0.1.0', activeSessions: 0 }),
    close: vi.fn().mockResolvedValue(undefined),
    setSessionId: vi.fn(),
    mode: 'remote',
    address: 'grpc.cmdop.com:443',
    isConnected: true,
  } as unknown as CMDOPClient;
}
