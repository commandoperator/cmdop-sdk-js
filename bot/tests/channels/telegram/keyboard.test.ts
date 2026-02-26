import { describe, it, expect } from 'vitest';
import { buildInlineKeyboard, buildMachineKeyboard } from '../../../src/channels/telegram/keyboard.js';

describe('buildInlineKeyboard', () => {
  it('creates a single row of buttons', () => {
    const kb = buildInlineKeyboard([
      { label: 'Run', command: '/exec ls' },
      { label: 'Help', command: '/help' },
    ]);
    expect(kb.inline_keyboard).toHaveLength(1);
    expect(kb.inline_keyboard[0]).toHaveLength(2);
    expect(kb.inline_keyboard[0]![0]!.text).toBe('Run');
    expect(kb.inline_keyboard[0]![0]!.callback_data).toBe('/exec ls');
  });

  it('handles empty actions', () => {
    const kb = buildInlineKeyboard([]);
    expect(kb.inline_keyboard[0]).toHaveLength(0);
  });
});

describe('buildMachineKeyboard', () => {
  it('groups machines two per row', () => {
    const kb = buildMachineKeyboard(['server1', 'server2', 'server3']);
    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0]).toHaveLength(2);
    expect(kb.inline_keyboard[1]).toHaveLength(1);
  });

  it('handles single machine', () => {
    const kb = buildMachineKeyboard(['only-server']);
    expect(kb.inline_keyboard).toHaveLength(1);
    expect(kb.inline_keyboard[0]).toHaveLength(1);
    expect(kb.inline_keyboard[0]![0]!.callback_data).toBe('/machine only-server');
  });

  it('handles empty list', () => {
    const kb = buildMachineKeyboard([]);
    expect(kb.inline_keyboard).toHaveLength(0);
  });

  it('prefixes button labels with machine icon', () => {
    const kb = buildMachineKeyboard(['web-01']);
    expect(kb.inline_keyboard[0]![0]!.text).toContain('web-01');
  });
});
