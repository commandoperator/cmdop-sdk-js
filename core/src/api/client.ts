/**
 * Pre-configured API clients for CMDOP SDK
 *
 * Usage:
 * ```typescript
 * import { api } from '@cmdop/core';
 *
 * // Set auth token
 * api.machines.setToken('your-jwt-token');
 *
 * // Use API
 * const machines = await api.machines.machines_machines.list();
 * ```
 */

import { API as MachinesAPI, MemoryStorageAdapter as MachinesStorage } from './generated/machines';
import { API as WorkspacesAPI, MemoryStorageAdapter as WorkspacesStorage } from './generated/workspaces';
import { API as SystemAPI, MemoryStorageAdapter as SystemStorage } from './generated/system';

/**
 * CMDOP API base URL
 */
export const API_BASE_URL = 'https://api.cmdop.com';

/**
 * Pre-configured API clients
 */
export const machines = new MachinesAPI(API_BASE_URL, { storage: new MachinesStorage() });
export const workspaces = new WorkspacesAPI(API_BASE_URL, { storage: new WorkspacesStorage() });
export const system = new SystemAPI(API_BASE_URL, { storage: new SystemStorage() });

/**
 * Combined API object for convenience
 */
export const api = {
  machines,
  workspaces,
  system,
} as const;
