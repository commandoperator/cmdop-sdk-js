import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager, InMemoryPermissionStore } from '../../src/core/permission-manager.js';
import { PermissionDeniedError } from '../../src/errors.js';

describe('InMemoryPermissionStore', () => {
  it('returns NONE for unknown user', async () => {
    const store = new InMemoryPermissionStore();
    expect(await store.getLevel('unknown')).toBe('NONE');
  });

  it('stores and retrieves level', async () => {
    const store = new InMemoryPermissionStore();
    await store.setLevel('u1', 'EXECUTE');
    expect(await store.getLevel('u1')).toBe('EXECUTE');
  });

  it('accepts seed values in constructor', async () => {
    const store = new InMemoryPermissionStore({ 'u1': 'FILES' });
    expect(await store.getLevel('u1')).toBe('FILES');
  });

  it('deletes user', async () => {
    const store = new InMemoryPermissionStore({ 'u1': 'READ' });
    await store.deleteUser('u1');
    expect(await store.getLevel('u1')).toBe('NONE');
  });
});

describe('PermissionManager', () => {
  let manager: PermissionManager;

  beforeEach(() => {
    manager = new PermissionManager(new InMemoryPermissionStore(), {
      adminUsers: ['admin-123'],
      defaultLevel: 'NONE',
    });
  });

  it('admin users always get ADMIN', async () => {
    expect(await manager.getLevel('admin-123')).toBe('ADMIN');
  });

  it('unknown user gets default NONE', async () => {
    expect(await manager.getLevel('nobody')).toBe('NONE');
  });

  it('set and get level', async () => {
    await manager.setLevel('user-1', 'READ');
    expect(await manager.getLevel('user-1')).toBe('READ');
  });

  it('hasPermission returns true when sufficient', async () => {
    await manager.setLevel('user-1', 'EXECUTE');
    expect(await manager.hasPermission('user-1', 'READ')).toBe(true);
    expect(await manager.hasPermission('user-1', 'EXECUTE')).toBe(true);
  });

  it('hasPermission returns false when insufficient', async () => {
    await manager.setLevel('user-1', 'READ');
    expect(await manager.hasPermission('user-1', 'EXECUTE')).toBe(false);
  });

  it('checkPermission does not throw when sufficient', async () => {
    await manager.setLevel('user-1', 'FILES');
    await expect(manager.checkPermission('user-1', 'EXECUTE')).resolves.toBeUndefined();
  });

  it('checkPermission throws PermissionDeniedError when insufficient', async () => {
    await expect(manager.checkPermission('nobody', 'READ')).rejects.toThrow(PermissionDeniedError);
  });

  it('admin passes any permission check', async () => {
    await expect(manager.checkPermission('admin-123', 'ADMIN')).resolves.toBeUndefined();
  });

  it('defaultLevel READ allows READ check to pass', async () => {
    const mgr = new PermissionManager(new InMemoryPermissionStore(), { defaultLevel: 'READ' });
    expect(await mgr.hasPermission('anyone', 'READ')).toBe(true);
    expect(await mgr.hasPermission('anyone', 'EXECUTE')).toBe(false);
  });
});
