import { describe, it, expect } from 'vitest';
import { SlackFormatter } from '../../../src/channels/slack/formatter.js';
import {
  BotError,
  PermissionDeniedError,
  CommandNotFoundError,
  CommandArgsError,
  MachineOfflineError,
  RateLimitError,
} from '../../../src/errors.js';

describe('SlackFormatter', () => {
  const fmt = new SlackFormatter();

  // ─── formatText ─────────────────────────────────────────────────────────────

  describe('formatText', () => {
    it('escapes ampersand', () => {
      expect(fmt.formatText('AT&T')).toBe('AT&amp;T');
    });

    it('escapes less-than', () => {
      expect(fmt.formatText('a < b')).toBe('a &lt; b');
    });

    it('escapes greater-than', () => {
      expect(fmt.formatText('a > b')).toBe('a &gt; b');
    });

    it('escapes ampersand before angle brackets to avoid double-escaping', () => {
      // "&lt;" should become "&amp;lt;" not "&lt;" (amp escaped first)
      expect(fmt.formatText('&lt;')).toBe('&amp;lt;');
    });

    it('passes through plain alphanumeric text unchanged', () => {
      expect(fmt.formatText('hello world 123')).toBe('hello world 123');
    });

    it('does not escape asterisk or underscore (mrkdwn formatting chars)', () => {
      // Slack mrkdwn uses * and _ for formatting — not escaped in plain text
      expect(fmt.formatText('*bold*')).toBe('*bold*');
      expect(fmt.formatText('_italic_')).toBe('_italic_');
    });

    it('does not escape dot or hyphen', () => {
      expect(fmt.formatText('192.168.1.1')).toBe('192.168.1.1');
      expect(fmt.formatText('x-y')).toBe('x-y');
    });
  });

  // ─── formatCode ─────────────────────────────────────────────────────────────

  describe('formatCode', () => {
    it('wraps code in triple backtick block', () => {
      const result = fmt.formatCode('ls -la');
      expect(result).toBe('```\nls -la\n```');
    });

    it('ignores language tag (Slack does not support it)', () => {
      const result = fmt.formatCode('echo hello', 'bash');
      // Slack code blocks have no language tag
      expect(result).toBe('```\necho hello\n```');
    });

    it('handles empty code', () => {
      const result = fmt.formatCode('');
      expect(result).toBe('```\n\n```');
    });

    it('truncates very long code', () => {
      const long = 'x'.repeat(5000);
      const result = fmt.formatCode(long);
      expect(result.length).toBeLessThanOrEqual(3000);
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
      expect(line).toContain('1.0K');
      expect(line).toContain('page_facing_up');
    });

    it('formats a directory without size', () => {
      const line = fmt.formatFileEntry('node_modules', true);
      expect(line).toContain('node_modules');
      expect(line).toContain('file_folder');
      expect(line).not.toContain('K');
    });
  });
});
