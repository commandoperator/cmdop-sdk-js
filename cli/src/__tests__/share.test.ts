import { describe, it, expect, mock } from 'bun:test';

const mockShareCreate = mock(() =>
  Promise.resolve({
    id: 'share-uuid',
    share_token: 'abc123',
    share_url: 'https://my.cmdop.com/shared/abc123',
    expires_at: '2025-01-02T00:00:00Z',
    is_active: true,
    is_expired: false,
    is_valid: true,
  }),
);

mock.module('@cmdop/core', () => ({
  MachinesModule: {
    API: class {
      machines_machine_sharing = { machinesMachinesShareCreate: mockShareCreate };
      setToken() {}
    },
    MemoryStorageAdapter: class {},
  },
}));
mock.module('@cmdop/node', () => ({
  getSettings: () => ({ apiBaseUrl: 'https://api.cmdop.com' }),
}));

import { createShare } from '../share.js';

describe('createShare', () => {
  it('calls API with machineId and expiry hours', async () => {
    const result = await createShare('test_key', 'machine-uuid', 24);

    expect(mockShareCreate).toHaveBeenCalledWith('machine-uuid', { expires_in_hours: 24 });
    expect(result.shareUrl).toBe('https://my.cmdop.com/shared/abc123');
    expect(result.expiresAt).toBe('2025-01-02T00:00:00Z');
  });

  it('passes null expiry when not provided', async () => {
    await createShare('test_key', 'machine-uuid');

    expect(mockShareCreate).toHaveBeenCalledWith('machine-uuid', { expires_in_hours: null });
  });
});
