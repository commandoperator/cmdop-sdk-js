import { describe, it, expect } from 'vitest';
import { PermissionManager, InMemoryPermissionStore, IdentityMap } from '../../src/core/permission-manager.js';
import { PermissionDeniedError } from '../../src/errors.js';

function makeManager(adminUsers: string[] = []) {
  const store = new InMemoryPermissionStore();
  const identityMap = new IdentityMap();
  const manager = new PermissionManager(store, { adminUsers, identityMap });
  return { store, identityMap, manager };
}

describe('PermissionManager with IdentityMap', () => {
  it('uses canonical ID for getLevel after linking', async () => {
    const { manager, identityMap } = makeManager();

    // Grant via Telegram ID
    await manager.setLevel('telegram:100', 'EXECUTE');

    // Link Telegram → Discord
    identityMap.link('telegram:100', 'discord:200');

    // Discord user should now have EXECUTE via canonical resolution
    expect(await manager.getLevel('discord:200')).toBe('EXECUTE');
  });

  it('setLevel on a linked ID stores under canonical', async () => {
    const { manager, identityMap, store } = makeManager();

    identityMap.link('telegram:100', 'discord:200');

    // Grant via Discord ID (non-canonical)
    await manager.setLevel('discord:200', 'FILES');

    // Canonical ID should have the level in the store
    expect(await store.getLevel('telegram:100')).toBe('FILES');
    // Telegram user also resolves to FILES
    expect(await manager.getLevel('telegram:100')).toBe('FILES');
  });

  it('permission check passes for linked ID', async () => {
    const { manager, identityMap } = makeManager();

    await manager.setLevel('telegram:100', 'EXECUTE');
    identityMap.link('telegram:100', 'discord:200');

    await expect(
      manager.checkPermission('discord:200', 'EXECUTE'),
    ).resolves.toBeUndefined();
  });

  it('permission check fails for unlinked ID', async () => {
    const { manager } = makeManager();
    await expect(
      manager.checkPermission('discord:999', 'EXECUTE'),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it('three-way linking shares permissions', async () => {
    const { manager, identityMap } = makeManager();

    identityMap.link('telegram:1', 'discord:2');
    identityMap.link('discord:2', 'slack:3');

    await manager.setLevel('telegram:1', 'ADMIN');

    expect(await manager.getLevel('discord:2')).toBe('ADMIN');
    expect(await manager.getLevel('slack:3')).toBe('ADMIN');
  });

  it('admin set by ID still works after linking', async () => {
    const { manager, identityMap } = makeManager(['telegram:100']);

    identityMap.link('telegram:100', 'discord:200');

    // Admin via original ID
    expect(await manager.getLevel('telegram:100')).toBe('ADMIN');
    // Admin via linked ID — resolved to canonical which is in adminSet
    expect(await manager.getLevel('discord:200')).toBe('ADMIN');
  });

  it('exposes identity map via .identity getter', () => {
    const { manager } = makeManager();
    expect(manager.identity).toBeInstanceOf(IdentityMap);
  });
});
