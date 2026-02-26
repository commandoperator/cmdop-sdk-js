import { describe, it, expect } from 'vitest';
import { IdentityMap } from '../../src/core/permission-manager.js';

describe('IdentityMap', () => {
  describe('platformId()', () => {
    it('formats channel:userId correctly', () => {
      expect(IdentityMap.platformId('telegram', '12345')).toBe('telegram:12345');
      expect(IdentityMap.platformId('discord', 'abc')).toBe('discord:abc');
    });
  });

  describe('resolve()', () => {
    it('returns the ID itself when no link exists', () => {
      const map = new IdentityMap();
      expect(map.resolve('telegram:123')).toBe('telegram:123');
    });

    it('returns canonical ID after linking', () => {
      const map = new IdentityMap();
      map.link('telegram:123', 'discord:456');
      // Both should resolve to the same canonical (first one = telegram:123)
      expect(map.resolve('discord:456')).toBe('telegram:123');
      expect(map.resolve('telegram:123')).toBe('telegram:123');
    });
  });

  describe('link()', () => {
    it('linking A→B makes both resolve to the same canonical', () => {
      const map = new IdentityMap();
      map.link('a', 'b');
      expect(map.resolve('a')).toBe(map.resolve('b'));
    });

    it('linking in reverse gives same canonical', () => {
      const map = new IdentityMap();
      map.link('b', 'a');
      expect(map.resolve('a')).toBe(map.resolve('b'));
    });

    it('linking three IDs transitively joins them all', () => {
      const map = new IdentityMap();
      map.link('telegram:1', 'discord:2');
      map.link('discord:2', 'slack:3');
      const canon = map.resolve('telegram:1');
      expect(map.resolve('discord:2')).toBe(canon);
      expect(map.resolve('slack:3')).toBe(canon);
    });

    it('linking already-same identity is a no-op', () => {
      const map = new IdentityMap();
      map.link('a', 'b');
      const canon = map.resolve('a');
      map.link('a', 'b'); // second call
      expect(map.resolve('a')).toBe(canon);
      expect(map.resolve('b')).toBe(canon);
    });
  });

  describe('areSameIdentity()', () => {
    it('returns false for unlinked IDs', () => {
      const map = new IdentityMap();
      expect(map.areSameIdentity('a', 'b')).toBe(false);
    });

    it('returns true after linking', () => {
      const map = new IdentityMap();
      map.link('a', 'b');
      expect(map.areSameIdentity('a', 'b')).toBe(true);
    });

    it('returns true for transitive links', () => {
      const map = new IdentityMap();
      map.link('a', 'b');
      map.link('b', 'c');
      expect(map.areSameIdentity('a', 'c')).toBe(true);
    });
  });

  describe('unlink()', () => {
    it('removes a specific ID from its group', () => {
      const map = new IdentityMap();
      map.link('a', 'b');
      map.unlink('b');
      expect(map.resolve('b')).toBe('b');     // back to itself
      expect(map.resolve('a')).toBe('a');     // a was canonical, now alone
    });
  });
});
