import { describe, it, expect } from 'vitest';
import { BotUserSchema, PermissionLevelSchema, PERMISSION_ORDER } from '../../src/models/user.js';
import { OutgoingMessageSchema } from '../../src/models/message.js';
import { parseCommand } from '../../src/models/command.js';
import { UserSessionSchema, MachineSessionSchema } from '../../src/models/session.js';

describe('PermissionLevelSchema', () => {
  it('accepts all valid levels', () => {
    for (const level of ['NONE', 'READ', 'EXECUTE', 'FILES', 'ADMIN'] as const) {
      expect(PermissionLevelSchema.parse(level)).toBe(level);
    }
  });

  it('rejects invalid level', () => {
    expect(() => PermissionLevelSchema.parse('SUPERADMIN')).toThrow();
  });

  it('PERMISSION_ORDER is monotonically increasing', () => {
    expect(PERMISSION_ORDER.NONE).toBe(0);
    expect(PERMISSION_ORDER.READ).toBe(1);
    expect(PERMISSION_ORDER.EXECUTE).toBe(2);
    expect(PERMISSION_ORDER.FILES).toBe(3);
    expect(PERMISSION_ORDER.ADMIN).toBe(4);
  });
});

describe('BotUserSchema', () => {
  const valid = {
    id: 'user-123',
    identity: { platform: 'telegram', platformId: '42' },
    permission: 'READ',
    createdAt: '2025-01-01T00:00:00Z',
    lastSeenAt: '2025-01-01T00:00:00Z',
  };

  it('parses valid user', () => {
    const u = BotUserSchema.parse(valid);
    expect(u.permission).toBe('READ');
    expect(u.createdAt).toBeInstanceOf(Date);
  });

  it('rejects missing id', () => {
    expect(() => BotUserSchema.parse({ ...valid, id: '' })).toThrow();
  });

  it('rejects invalid permission', () => {
    expect(() => BotUserSchema.parse({ ...valid, permission: 'GOD' })).toThrow();
  });
});

describe('OutgoingMessageSchema', () => {
  it('parses text message', () => {
    const m = OutgoingMessageSchema.parse({ type: 'text', text: 'hello' });
    expect(m.type).toBe('text');
  });

  it('parses code message', () => {
    const m = OutgoingMessageSchema.parse({ type: 'code', code: 'ls -la', language: 'bash' });
    expect(m.type).toBe('code');
  });

  it('parses error message', () => {
    const m = OutgoingMessageSchema.parse({ type: 'error', message: 'boom' });
    expect(m.type).toBe('error');
  });

  it('rejects unknown type', () => {
    expect(() => OutgoingMessageSchema.parse({ type: 'gif', url: 'http://x.com' })).toThrow();
  });
});

describe('parseCommand', () => {
  it('parses /exec ls -la', () => {
    const cmd = parseCommand('/exec ls -la');
    expect(cmd).not.toBeNull();
    expect(cmd!.name).toBe('exec');
    expect(cmd!.args).toEqual(['ls', '-la']);
  });

  it('returns null without prefix (plain text ignored)', () => {
    expect(parseCommand('help')).toBeNull();
    expect(parseCommand('exec ls')).toBeNull();
  });

  it('parses with ! prefix', () => {
    const cmd = parseCommand('!agent tell me something');
    expect(cmd!.name).toBe('agent');
    expect(cmd!.args).toEqual(['tell', 'me', 'something']);
  });

  it('lowercases command name', () => {
    const cmd = parseCommand('/EXEC ls');
    expect(cmd!.name).toBe('exec');
  });

  it('returns null for empty string', () => {
    expect(parseCommand('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(parseCommand('   ')).toBeNull();
  });
});

describe('UserSessionSchema', () => {
  it('parses valid session', () => {
    const s = UserSessionSchema.parse({
      userId: 'u1',
      currentMachine: 'server1',
      updatedAt: '2025-01-01T00:00:00Z',
    });
    expect(s.userId).toBe('u1');
    expect(s.updatedAt).toBeInstanceOf(Date);
  });
});

describe('MachineSessionSchema', () => {
  it('parses valid machine session', () => {
    const s = MachineSessionSchema.parse({ sessionId: 's1', status: 'online' });
    expect(s.status).toBe('online');
  });

  it('rejects invalid status', () => {
    expect(() => MachineSessionSchema.parse({ sessionId: 's1', status: 'busy' })).toThrow();
  });
});
