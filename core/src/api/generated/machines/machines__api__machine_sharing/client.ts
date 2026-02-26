// @ts-nocheck
import * as Models from "./models";


/**
 * API endpoints for Machine Sharing.
 */
export class MachinesMachineSharing {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Create share link for machine
   * 
   * Create a public share link for read-only terminal viewing. Only
   * workspace owner or admin can create shares.
   */
  async machinesMachinesShareCreate(id: string, data: Models.SharedMachineCreateRequest): Promise<Models.SharedMachine> {
    const response = await this.client.request('POST', `/api/machines/machines/${id}/share/`, { body: data });
    return response;
  }

  async machinesMachinesSharesList(id: string, ordering?: string, page?: number, page_size?: number, search?: string): Promise<Models.PaginatedSharedMachineListList>;
  async machinesMachinesSharesList(id: string, params?: { ordering?: string; page?: number; page_size?: number; search?: string }): Promise<Models.PaginatedSharedMachineListList>;

  /**
   * List active shares for machine
   * 
   * Get all active share links for this machine
   */
  async machinesMachinesSharesList(...args: any[]): Promise<Models.PaginatedSharedMachineListList> {
    const id = args[0];
    const isParamsObject = args.length === 2 && typeof args[1] === 'object' && args[1] !== null && !Array.isArray(args[1]);
    
    let params;
    if (isParamsObject) {
      params = args[1];
    } else {
      params = { ordering: args[1], page: args[2], page_size: args[3], search: args[4] };
    }
    const response = await this.client.request('GET', `/api/machines/machines/${id}/shares/`, { params });
    return response;
  }

  /**
   * Remove all shares for machine
   * 
   * Deactivate all share links for this machine. Only workspace owner or
   * admin can remove shares.
   */
  async machinesMachinesUnshareDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/machines/machines/${id}/unshare/`);
    return;
  }

}