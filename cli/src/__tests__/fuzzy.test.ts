import { describe, it, expect } from 'bun:test';
import { fuzzyMatch } from '../fuzzy.js';

describe('fuzzyMatch', () => {
  it('matches exact string', () => {
    expect(fuzzyMatch('hello', 'hello')).toBe(true);
  });

  it('matches subsequence', () => {
    expect(fuzzyMatch('hlo', 'hello')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(fuzzyMatch('HEL', 'hello')).toBe(true);
    expect(fuzzyMatch('hel', 'HELLO')).toBe(true);
  });

  it('rejects non-matching', () => {
    expect(fuzzyMatch('xyz', 'hello')).toBe(false);
  });

  it('rejects reversed order', () => {
    expect(fuzzyMatch('olh', 'hello')).toBe(false);
  });

  it('matches empty needle', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true);
  });

  it('rejects non-empty needle with empty haystack', () => {
    expect(fuzzyMatch('a', '')).toBe(false);
  });

  it('matches hostname-like patterns', () => {
    expect(fuzzyMatch('prod', 'prod-server-01')).toBe(true);
    expect(fuzzyMatch('p01', 'prod-server-01')).toBe(true);
    expect(fuzzyMatch('sv01', 'prod-server-01')).toBe(true);
  });
});
