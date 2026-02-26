import { describe, it, expect } from 'vitest';
import {
  sectionBlock,
  headerBlock,
  dividerBlock,
  contextBlock,
  fileListBlocks,
  machineStatusBlocks,
  errorBlocks,
} from '../../../src/channels/slack/blocks.js';
import type { FileEntry, MachineStatus } from '../../../src/channels/slack/blocks.js';

describe('sectionBlock', () => {
  it('returns type section with mrkdwn text', () => {
    const b = sectionBlock('hello *world*');
    expect(b.type).toBe('section');
    expect((b.text as { text: string }).text).toBe('hello *world*');
    expect((b.text as { type: string }).type).toBe('mrkdwn');
  });
});

describe('headerBlock', () => {
  it('returns type header with plain_text', () => {
    const b = headerBlock('Title');
    expect(b.type).toBe('header');
    expect((b.text as { type: string }).type).toBe('plain_text');
    expect((b.text as { text: string }).text).toBe('Title');
  });
});

describe('dividerBlock', () => {
  it('returns type divider', () => {
    expect(dividerBlock().type).toBe('divider');
  });
});

describe('contextBlock', () => {
  it('returns type context with mrkdwn element', () => {
    const b = contextBlock('3 items');
    expect(b.type).toBe('context');
    const elements = b.elements as Array<{ type: string; text: string }>;
    expect(elements[0]?.type).toBe('mrkdwn');
    expect(elements[0]?.text).toBe('3 items');
  });
});

describe('fileListBlocks', () => {
  it('includes a header with the path', () => {
    const blocks = fileListBlocks('/home/user', []);
    expect(blocks[0]?.type).toBe('header');
    const headerText = (blocks[0] as { text: { text: string } }).text.text;
    expect(headerText).toContain('/home/user');
  });

  it('shows empty message when no entries', () => {
    const blocks = fileListBlocks('/tmp', []);
    const texts = blocks.map((b) => JSON.stringify(b));
    expect(texts.join('')).toContain('empty');
  });

  it('renders file entries with icons and sizes', () => {
    const entries: FileEntry[] = [
      { name: 'readme.txt', isDir: false, size: 512 },
      { name: 'src', isDir: true },
    ];
    const blocks = fileListBlocks('/project', entries);
    const content = JSON.stringify(blocks);
    expect(content).toContain('readme.txt');
    expect(content).toContain('512B');
    expect(content).toContain('src');
    expect(content).toContain('file_folder');
  });

  it('adds a context block with item count', () => {
    const entries: FileEntry[] = [
      { name: 'a.txt', isDir: false },
      { name: 'b.txt', isDir: false },
    ];
    const blocks = fileListBlocks('/dir', entries);
    const last = blocks[blocks.length - 1];
    expect(last?.type).toBe('context');
    const contextText = JSON.stringify(last);
    expect(contextText).toContain('2 items');
  });

  it('chunks large directories', () => {
    const entries: FileEntry[] = Array.from({ length: 65 }, (_, i) => ({
      name: `file${i}.txt`,
      isDir: false,
    }));
    const blocks = fileListBlocks('/large', entries, 30);
    // header + ceil(65/30) section blocks + context = 1 + 3 + 1 = 5
    expect(blocks.length).toBe(5);
  });
});

describe('machineStatusBlocks', () => {
  it('shows "no machines" for empty list', () => {
    const blocks = machineStatusBlocks([]);
    expect(JSON.stringify(blocks)).toContain('No machines');
  });

  it('includes hostname and online status', () => {
    const machines: MachineStatus[] = [
      { hostname: 'web-01', online: true },
      { hostname: 'db-01', online: false },
    ];
    const content = JSON.stringify(machineStatusBlocks(machines));
    expect(content).toContain('web-01');
    expect(content).toContain('db-01');
    expect(content).toContain('online');
    expect(content).toContain('offline');
  });

  it('includes header block', () => {
    const blocks = machineStatusBlocks([{ hostname: 'srv', online: true }]);
    expect(blocks[0]?.type).toBe('header');
  });
});

describe('errorBlocks', () => {
  it('includes the error message', () => {
    const blocks = errorBlocks('Something failed');
    expect(JSON.stringify(blocks)).toContain('Something failed');
  });

  it('includes detail in context block when provided', () => {
    const blocks = errorBlocks('Oops', 'Exit code 1');
    expect(blocks).toHaveLength(2);
    expect(blocks[1]?.type).toBe('context');
    expect(JSON.stringify(blocks[1])).toContain('Exit code 1');
  });

  it('omits context block when detail is absent', () => {
    const blocks = errorBlocks('Oops');
    expect(blocks).toHaveLength(1);
  });
});
