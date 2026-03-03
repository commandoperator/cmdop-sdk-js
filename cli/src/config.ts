import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';

export interface CLIConfig {
  apiKey?: string;
  server?: string;
  recentHosts: string[];
}

const DEFAULT_CONFIG: CLIConfig = { recentHosts: [] };

function configDir(): string {
  return join(process.env.CMDOP_CONFIG_DIR || join(homedir(), '.config', 'cmdok'));
}

function configFile(): string {
  return join(configDir(), 'config.json');
}

export function getConfigPath(): string {
  return configFile();
}

export function loadConfig(): CLIConfig {
  try {
    const raw = readFileSync(configFile(), 'utf-8');
    const data = JSON.parse(raw);
    const config = { ...DEFAULT_CONFIG, ...data };
    // Sanitize: filter out null/empty entries from recentHosts
    config.recentHosts = config.recentHosts.filter((h: unknown) => typeof h === 'string' && h.length > 0);
    return config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: CLIConfig): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(configFile(), JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function deleteConfig(): void {
  try {
    const file = configFile();
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // ignore
  }
}

export function addRecentHost(hostname: string): void {
  if (!hostname) return;
  const config = loadConfig();
  config.recentHosts = [
    hostname,
    ...config.recentHosts.filter((h) => h && h !== hostname),
  ].slice(0, 5);
  saveConfig(config);
}

export function maskApiKey(key: string): string {
  if (key.length <= 15) return '****';
  return key.slice(0, 12) + '...' + key.slice(-4);
}
