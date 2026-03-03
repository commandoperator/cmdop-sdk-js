import { getSettings } from '@cmdop/node';
import { MachinesModule } from '@cmdop/core';

export interface ShareResult {
  shareUrl: string;
  expiresAt: string | null;
}

export async function createShare(apiKey: string, machineId: string, expiresInHours?: number): Promise<ShareResult> {
  const baseUrl = getSettings().apiBaseUrl;
  const api = new MachinesModule.API(baseUrl, {
    storage: new MachinesModule.MemoryStorageAdapter(),
  });
  api.setToken(apiKey);

  const result = await api.machines_machine_sharing.machinesMachinesShareCreate(machineId, {
    expires_in_hours: expiresInHours ?? null,
  });

  return {
    shareUrl: result.share_url,
    expiresAt: result.expires_at ?? null,
  };
}
