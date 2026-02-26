// @ts-nocheck
import * as Models from "./models";


/**
 * API endpoints for Machines.
 */
export class MachinesMachines {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  async logsList(ordering?: string, page?: number, page_size?: number, search?: string): Promise<Models.PaginatedMachineLogList>;
  async logsList(params?: { ordering?: string; page?: number; page_size?: number; search?: string }): Promise<Models.PaginatedMachineLogList>;

  /**
   * ViewSet for MachineLog operations. Read-only except for creation. Logs
   * are created by agents.
   */
  async logsList(...args: any[]): Promise<Models.PaginatedMachineLogList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], search: args[3] };
    }
    const response = await this.client.request('GET', "/api/machines/logs/", { params });
    return response;
  }

  /**
   * ViewSet for MachineLog operations. Read-only except for creation. Logs
   * are created by agents.
   */
  async logsCreate(data: Models.MachineLogRequest): Promise<Models.MachineLog> {
    const response = await this.client.request('POST', "/api/machines/logs/", { body: data });
    return response;
  }

  /**
   * ViewSet for MachineLog operations. Read-only except for creation. Logs
   * are created by agents.
   */
  async logsRetrieve(id: string): Promise<Models.MachineLog> {
    const response = await this.client.request('GET', `/api/machines/logs/${id}/`);
    return response;
  }

  async machinesList(ordering?: string, page?: number, page_size?: number, search?: string): Promise<Models.PaginatedMachineList>;
  async machinesList(params?: { ordering?: string; page?: number; page_size?: number; search?: string }): Promise<Models.PaginatedMachineList>;

  /**
   * ViewSet for Machine operations. Provides CRUD operations for remote
   * machines with monitoring capabilities.
   */
  async machinesList(...args: any[]): Promise<Models.PaginatedMachineList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], search: args[3] };
    }
    const response = await this.client.request('GET', "/api/machines/machines/", { params });
    return response;
  }

  /**
   * ViewSet for Machine operations. Provides CRUD operations for remote
   * machines with monitoring capabilities.
   */
  async machinesCreate(data: Models.MachineCreateRequest): Promise<Models.MachineCreate> {
    const response = await this.client.request('POST', "/api/machines/machines/", { body: data });
    return response;
  }

  /**
   * ViewSet for Machine operations. Provides CRUD operations for remote
   * machines with monitoring capabilities.
   */
  async machinesRetrieve(id: string): Promise<Models.Machine> {
    const response = await this.client.request('GET', `/api/machines/machines/${id}/`);
    return response;
  }

  /**
   * ViewSet for Machine operations. Provides CRUD operations for remote
   * machines with monitoring capabilities.
   */
  async machinesUpdate(id: string, data: Models.MachineRequest): Promise<Models.Machine> {
    const response = await this.client.request('PUT', `/api/machines/machines/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for Machine operations. Provides CRUD operations for remote
   * machines with monitoring capabilities.
   */
  async machinesPartialUpdate(id: string, data?: Models.PatchedMachineRequest): Promise<Models.Machine> {
    const response = await this.client.request('PATCH', `/api/machines/machines/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for Machine operations. Provides CRUD operations for remote
   * machines with monitoring capabilities.
   */
  async machinesDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/machines/machines/${id}/`);
    return;
  }

  async machinesLogsList(id: string, level?: string, limit?: number, ordering?: string, page?: number, page_size?: number, search?: string): Promise<Models.PaginatedMachineLogList>;
  async machinesLogsList(id: string, params?: { level?: string; limit?: number; ordering?: string; page?: number; page_size?: number; search?: string }): Promise<Models.PaginatedMachineLogList>;

  /**
   * Get machine logs
   * 
   * Get logs for this machine.
   */
  async machinesLogsList(...args: any[]): Promise<Models.PaginatedMachineLogList> {
    const id = args[0];
    const isParamsObject = args.length === 2 && typeof args[1] === 'object' && args[1] !== null && !Array.isArray(args[1]);
    
    let params;
    if (isParamsObject) {
      params = args[1];
    } else {
      params = { level: args[1], limit: args[2], ordering: args[3], page: args[4], page_size: args[5], search: args[6] };
    }
    const response = await this.client.request('GET', `/api/machines/machines/${id}/logs/`, { params });
    return response;
  }

  /**
   * Regenerate agent token
   * 
   * Regenerate machine agent token.
   */
  async machinesRegenerateTokenCreate(id: string, data: Models.MachineRequest): Promise<any> {
    const response = await this.client.request('POST', `/api/machines/machines/${id}/regenerate-token/`, { body: data });
    return response;
  }

  /**
   * Get machine statistics
   * 
   * Get machine statistics.
   */
  async machinesStatsRetrieve(id: string): Promise<any> {
    const response = await this.client.request('GET', `/api/machines/machines/${id}/stats/`);
    return response;
  }

  /**
   * Update machine metrics
   * 
   * Update machine metrics (called by agent).
   */
  async machinesUpdateMetricsCreate(id: string, data: Models.MachinesMachinesUpdateMetricsCreateRequest): Promise<Models.Machine> {
    const response = await this.client.request('POST', `/api/machines/machines/${id}/update-metrics/`, { body: data });
    return response;
  }

}