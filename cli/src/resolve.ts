import { consola as logger } from 'consola';
import { loadConfig, saveConfig, addRecentHost } from './config.js';
import { CLI_NAME, DASHBOARD_URL } from './constants.js';
import { fetchMachines, filterAndSortMachines, formatMachineLabels, type MachineInfo } from './machines.js';
import { fuzzyMatch } from './fuzzy.js';

export interface ResolvedMachine {
  hostname: string;
  machineId: string;
}

export async function resolveApiKey(flagValue: string): Promise<string | null> {
  // 1. CLI flag
  if (flagValue) return flagValue;

  // 2. Env var
  const envKey = process.env.CMDOP_API_KEY;
  if (envKey) return envKey;

  // 3. Saved config
  const config = loadConfig();
  if (config.apiKey) return config.apiKey;

  // 4. Interactive prompt → onboarding
  logger.box(`Welcome to ${CLI_NAME}!`);
  logger.info(`Get your API key at: ${DASHBOARD_URL}\n`);

  const apiKey = await logger.prompt('API Key', {
    type: 'text',
    placeholder: 'cmdop_live_...',
  });
  if (typeof apiKey === 'symbol' || !apiKey) {
    logger.warn('Cancelled.');
    return null;
  }

  saveConfig({ ...config, apiKey });

  logger.success('Configuration saved.');
  return apiKey;
}

const MACHINE_LIST_THRESHOLD = 15;

export async function resolveHostname(argHostname: string, apiKey: string): Promise<ResolvedMachine | null> {
  // 1. Passed as argument — look up machine ID from API
  if (argHostname) {
    addRecentHost(argHostname);
    let machineId = '';
    try {
      const machines = await fetchMachines(apiKey);
      const match = machines.find((m) => m.hostname === argHostname);
      if (match) machineId = match.id;
    } catch { /* best-effort lookup */ }
    return { hostname: argHostname, machineId };
  }

  const config = loadConfig();
  const recentHosts = config.recentHosts;

  // 2. Load machines from API
  let machines: MachineInfo[];
  try {
    logger.start('Loading machines...');
    machines = await fetchMachines(apiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to load machines: ${msg}`);
    logger.info(`Run \`${CLI_NAME} login\` to configure or get a key at: ${DASHBOARD_URL}`);
    return null;
  }

  // Build hostname → machine ID map
  const machineIdMap = new Map(machines.map((m) => [m.hostname, m.id]));

  // 3. Filter offline (keep only online + recent) and sort
  const sorted = filterAndSortMachines(machines, recentHosts);

  // 4. No machines → manual input
  if (sorted.length === 0) {
    logger.info('No machines found in workspace.');
    return promptNewHostname(machineIdMap);
  }

  // 5. Small list → select directly
  if (sorted.length <= MACHINE_LIST_THRESHOLD) {
    return pickFromList(sorted, recentHosts, machineIdMap);
  }

  // 6. Large list → fuzzy search loop
  return fuzzyPickMachine(sorted, recentHosts, machineIdMap);
}

async function pickFromList(machines: MachineInfo[], recentHosts: string[], machineIdMap: Map<string, string>): Promise<ResolvedMachine | null> {
  const options = formatMachineLabels(machines, recentHosts);

  const selected = await logger.prompt('Select machine', {
    type: 'select',
    options,
  });
  if (typeof selected === 'symbol') {
    logger.warn('Cancelled.');
    return null;
  }

  const hostname = selected as string;
  addRecentHost(hostname);
  return { hostname, machineId: machineIdMap.get(hostname) ?? '' };
}

async function fuzzyPickMachine(machines: MachineInfo[], recentHosts: string[], machineIdMap: Map<string, string>): Promise<ResolvedMachine | null> {
  while (true) {
    const query = await logger.prompt(`Found ${machines.length} machines. Search`, { type: 'text' });
    if (typeof query === 'symbol' || !query) {
      logger.warn('Cancelled.');
      return null;
    }

    const filtered = machines.filter(
      (m) => fuzzyMatch(query, m.hostname) || fuzzyMatch(query, m.name),
    );

    if (filtered.length === 0) {
      logger.warn('No matches. Try again.');
      continue;
    }

    const options = formatMachineLabels(filtered, recentHosts);

    const selected = await logger.prompt('Select machine', {
      type: 'select',
      options,
    });
    if (typeof selected === 'symbol') {
      logger.warn('Cancelled.');
      return null;
    }

    const hostname = selected as string;
    addRecentHost(hostname);
    return { hostname, machineId: machineIdMap.get(hostname) ?? '' };
  }
}

async function promptNewHostname(machineIdMap: Map<string, string>): Promise<ResolvedMachine | null> {
  const hostname = await logger.prompt('Hostname', { type: 'text' });
  if (typeof hostname === 'symbol' || !hostname) {
    logger.warn('Cancelled.');
    return null;
  }
  addRecentHost(hostname);
  return { hostname, machineId: machineIdMap.get(hostname) ?? '' };
}
