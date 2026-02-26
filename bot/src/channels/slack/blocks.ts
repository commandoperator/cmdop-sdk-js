/**
 * Slack Block Kit builders for structured CMDOP output.
 *
 * Blocks are the Slack equivalent of Discord embeds.
 * Used for file listings, machine tables, and error cards.
 *
 * Reference: https://api.slack.com/block-kit
 */

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

// ─── Section block ────────────────────────────────────────────────────────────

export function sectionBlock(text: string): SlackBlock {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text },
  };
}

// ─── Header block ─────────────────────────────────────────────────────────────

export function headerBlock(text: string): SlackBlock {
  return {
    type: 'header',
    text: { type: 'plain_text', text, emoji: true },
  };
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function dividerBlock(): SlackBlock {
  return { type: 'divider' };
}

// ─── Context block (small grey text) ─────────────────────────────────────────

export function contextBlock(text: string): SlackBlock {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text }],
  };
}

// ─── File listing block ───────────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  isDir: boolean;
  size?: number;
}

/**
 * Build a Block Kit representation of a file listing.
 * Splits into chunks of up to `chunkSize` entries per section block
 * to respect Slack's 3000-char section limit.
 */
export function fileListBlocks(
  path: string,
  entries: FileEntry[],
  chunkSize = 30,
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    headerBlock(`:open_file_folder: ${path}`),
  ];

  if (entries.length === 0) {
    blocks.push(sectionBlock('_(empty directory)_'));
    return blocks;
  }

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const lines = chunk.map((e) => {
      const icon = e.isDir ? ':file_folder:' : ':page_facing_up:';
      const size = e.size !== undefined && !e.isDir ? ` (${formatBytes(e.size)})` : '';
      return `${icon} \`${e.name}\`${size}`;
    });
    blocks.push(sectionBlock(lines.join('\n')));
  }

  blocks.push(contextBlock(`${entries.length} item${entries.length === 1 ? '' : 's'}`));
  return blocks;
}

// ─── Machine status table ─────────────────────────────────────────────────────

export interface MachineStatus {
  hostname: string;
  online: boolean;
  label?: string;
}

/**
 * Build a Block Kit machine status table.
 */
export function machineStatusBlocks(machines: MachineStatus[]): SlackBlock[] {
  if (machines.length === 0) {
    return [sectionBlock('No machines configured.')];
  }

  const lines = machines.map((m) => {
    const status = m.online ? ':large_green_circle: online' : ':red_circle: offline';
    const label = m.label ? ` — ${m.label}` : '';
    return `*${m.hostname}*${label}  ${status}`;
  });

  return [
    headerBlock(':computer: Machine Status'),
    sectionBlock(lines.join('\n')),
  ];
}

// ─── Error card ───────────────────────────────────────────────────────────────

/**
 * Build a Block Kit error card with context.
 */
export function errorBlocks(message: string, detail?: string): SlackBlock[] {
  const blocks: SlackBlock[] = [
    sectionBlock(`:x: *Error*\n${message}`),
  ];
  if (detail) {
    blocks.push(contextBlock(detail));
  }
  return blocks;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
