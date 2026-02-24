/**
 * CMDOP SDK API Client
 *
 * Pre-configured clients for https://api.cmdop.com
 *
 * Usage:
 * ```typescript
 * import { api } from '@cmdop/core';
 *
 * // Set auth token (from OAuth or API key)
 * api.machines.setToken('your-jwt-token');
 *
 * // Use API
 * const list = await api.machines.machines_machines.list();
 * ```
 */

// Pre-configured clients (recommended)
export { api, machines, workspaces, system, API_BASE_URL } from './client';

// Re-export generated modules for custom configuration
export * as MachinesModule from './generated/machines';
export * as WorkspacesModule from './generated/workspaces';
export * as SystemModule from './generated/system';
