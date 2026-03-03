import { getSettings } from '@cmdop/node';
import { MachinesModule } from '@cmdop/core';

type Machine = MachinesModule.MachinesMachinesTypes.Machine;

export interface MachineInfo {
  id: string;
  name: string;
  hostname: string;
  os: string;
  is_online: boolean;
  status?: string;
  last_seen?: string | null;
  agent_version?: string;
}

function toMachineInfo(m: Machine): MachineInfo {
  return {
    id: m.id,
    name: m.name,
    hostname: m.hostname,
    os: m.os,
    is_online: m.is_online,
    status: m.status,
    last_seen: m.last_seen,
    agent_version: m.agent_version,
  };
}

export async function fetchMachines(apiKey: string): Promise<MachineInfo[]> {
  const baseUrl = getSettings().apiBaseUrl;
  const api = new MachinesModule.API(baseUrl, {
    storage: new MachinesModule.MemoryStorageAdapter(),
  });
  api.setToken(apiKey);

  const all: MachineInfo[] = [];
  let page = 1;

  while (true) {
    const result = await api.machines_machines.machinesList({
      page,
      page_size: 100,
    });
    all.push(...result.results.map(toMachineInfo));
    if (!result.has_next) break;
    page++;
  }

  return all;
}

/**
 * Filter and sort machines:
 * - Keep all online machines
 * - Keep offline only if in recentHosts
 * - Sort: recent hosts first, then online by lastSeen desc
 */
export function filterAndSortMachines(machines: MachineInfo[], recentHosts: string[]): MachineInfo[] {
  const recentSet = new Set(recentHosts);
  const recentIndex = new Map(recentHosts.map((h, i) => [h, i]));

  const filtered = machines.filter(
    (m) => m.is_online || recentSet.has(m.hostname),
  );

  return filtered.sort((a, b) => {
    const aRecent = recentIndex.get(a.hostname);
    const bRecent = recentIndex.get(b.hostname);

    if (aRecent !== undefined && bRecent !== undefined) return aRecent - bRecent;
    if (aRecent !== undefined) return -1;
    if (bRecent !== undefined) return 1;

    if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;

    const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
    const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    return bTime - aTime;
  });
}

export function formatMachineLabels(machines: MachineInfo[], recentHosts: string[]): { label: string; value: string }[] {
  const recentSet = new Set(recentHosts);
  const maxHost = Math.max(...machines.map((m) => m.hostname.length), 8) + 2;
  const maxOs = Math.max(...machines.map((m) => m.os.length), 4) + 2;

  return machines.map((m) => {
    const host = m.hostname.padEnd(maxHost);
    const os = m.os.padEnd(maxOs);
    const statusIcon = m.is_online ? '\u25CF' : '\u25CB';
    const statusText = m.is_online ? 'online' : 'offline';
    const recent = recentSet.has(m.hostname) ? '  (last used)' : '';
    return {
      label: `${host}${os}${statusIcon} ${statusText}${recent}`,
      value: m.hostname,
    };
  });
}
