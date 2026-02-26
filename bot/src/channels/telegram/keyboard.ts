import type { InlineKeyboardButton } from 'grammy/types';

export interface KeyboardAction {
  label: string;
  command: string;
}

/**
 * Build a simple inline keyboard row from command shortcuts.
 */
export function buildInlineKeyboard(actions: KeyboardAction[]): { inline_keyboard: InlineKeyboardButton[][] } {
  const row: InlineKeyboardButton[] = actions.map((a) => ({
    text: a.label,
    callback_data: a.command,
  }));
  return { inline_keyboard: [row] };
}

/**
 * Standard machine selection keyboard.
 */
export function buildMachineKeyboard(machines: string[]): { inline_keyboard: InlineKeyboardButton[][] } {
  const rows: InlineKeyboardButton[][] = [];
  // Two machines per row
  for (let i = 0; i < machines.length; i += 2) {
    const row: InlineKeyboardButton[] = [
      { text: `🖥 ${machines[i]!}`, callback_data: `/machine ${machines[i]!}` },
    ];
    if (machines[i + 1]) {
      row.push({ text: `🖥 ${machines[i + 1]!}`, callback_data: `/machine ${machines[i + 1]!}` });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
}
