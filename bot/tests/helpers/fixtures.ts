import type { CommandContext } from '../../src/models/command.js';
import type { IncomingMessage } from '../../src/models/message.js';

export function makeMessage(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    id: 'msg-001',
    userId: 'user-123',
    channelId: 'test-channel',
    text: '/exec ls -la',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    attachments: [],
    ...overrides,
  };
}

export function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    userId: 'user-123',
    command: 'exec',
    args: ['ls', '-la'],
    channelId: 'test-channel',
    message: makeMessage(),
    ...overrides,
  };
}
