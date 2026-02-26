import { describe, it, expect } from 'vitest';
import { TelegramFormatter } from '../../../src/channels/telegram/formatter.js';
import {
  BotError,
  PermissionDeniedError,
  CommandNotFoundError,
  CommandArgsError,
  MachineOfflineError,
  RateLimitError,
} from '../../../src/errors.js';

describe('TelegramFormatter', () => {
  const fmt = new TelegramFormatter();

  // ─── formatText ─────────────────────────────────────────────────────────────

  describe('formatText', () => {
    it('escapes underscore', () => {
      expect(fmt.formatText('hello_world')).toBe('hello\\_world');
    });

    it('escapes asterisk', () => {
      expect(fmt.formatText('2 * 2')).toBe('2 \\* 2');
    });

    it('escapes dot', () => {
      expect(fmt.formatText('192.168.1.1')).toBe('192\\.168\\.1\\.1');
    });

    it('escapes parentheses', () => {
      expect(fmt.formatText('func(x)')).toBe('func\\(x\\)');
    });

    it('escapes exclamation mark', () => {
      expect(fmt.formatText('Hello!')).toBe('Hello\\!');
    });

    it('escapes hash', () => {
      expect(fmt.formatText('#tag')).toBe('\\#tag');
    });

    it('escapes hyphen', () => {
      expect(fmt.formatText('x-y')).toBe('x\\-y');
    });

    it('passes through plain alphanumeric text unchanged', () => {
      expect(fmt.formatText('hello world 123')).toBe('hello world 123');
    });

    it('escapes backslash', () => {
      expect(fmt.formatText('a\\b')).toBe('a\\\\b');
    });
  });

  // ─── formatCode ─────────────────────────────────────────────────────────────

  describe('formatCode', () => {
    it('wraps code in triple backtick block', () => {
      const result = fmt.formatCode('ls -la');
      expect(result).toBe('```\nls -la\n```');
    });

    it('includes language tag', () => {
      const result = fmt.formatCode('echo hello', 'bash');
      expect(result).toBe('```bash\necho hello\n```');
    });

    it('handles empty code', () => {
      const result = fmt.formatCode('');
      expect(result).toBe('```\n\n```');
    });

    it('truncates very long code', () => {
      const long = 'x'.repeat(5000);
      const result = fmt.formatCode(long);
      expect(result.length).toBeLessThanOrEqual(4096);
      expect(result).toContain('truncated');
    });

    it('replaces ``` inside code to avoid breaking block', () => {
      const result = fmt.formatCode('echo ```test```');
      expect(result).not.toMatch(/```test```/);
    });
  });

  // ─── formatError ────────────────────────────────────────────────────────────

  describe('formatError', () => {
    it('formats PermissionDeniedError', () => {
      const err = new PermissionDeniedError('u1', 'EXECUTE');
      const text = fmt.formatError(err);
      expect(text).toContain('Access denied');
      expect(text).toContain('EXECUTE');
    });

    it('formats CommandNotFoundError', () => {
      const err = new CommandNotFoundError('foo');
      const text = fmt.formatError(err);
      expect(text).toContain('/foo');
      expect(text).toContain('help');
    });

    it('formats CommandArgsError', () => {
      const err = new CommandArgsError('exec', 'command required');
      const text = fmt.formatError(err);
      expect(text).toContain('exec');
    });

    it('formats MachineOfflineError', () => {
      const err = new MachineOfflineError('my-server');
      const text = fmt.formatError(err);
      expect(text).toContain('offline');
    });

    it('formats RateLimitError', () => {
      const err = new RateLimitError('too many requests');
      const text = fmt.formatError(err);
      expect(text).toContain('Rate limit');
    });

    it('formats generic BotError with safe fallback', () => {
      const err = new BotError('something bad');
      const text = fmt.formatError(err);
      expect(text).toContain('Something went wrong');
      expect(text).not.toContain('something bad');
    });
  });

  // ─── formatFileEntry ────────────────────────────────────────────────────────

  describe('formatFileEntry', () => {
    it('formats a file with size', () => {
      const line = fmt.formatFileEntry('readme.txt', false, 1024);
      expect(line).toContain('readme.txt');
      expect(line).toContain('1\\.0K');
      expect(line).toContain('📄');
    });

    it('formats a directory without size', () => {
      const line = fmt.formatFileEntry('node_modules', true);
      expect(line).toContain('node_modules');
      expect(line).toContain('📁');
      expect(line).not.toContain('K');
    });
  });
});
