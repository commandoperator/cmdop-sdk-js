import * as Models from "./models";


/**
 * API endpoints for System.
 */
export class SystemSystem {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  async alertsList(ordering?: string, page?: number, page_size?: number, read?: boolean, search?: string, type?: string, workspace?: string): Promise<Models.PaginatedAlertList>;
  async alertsList(params?: { ordering?: string; page?: number; page_size?: number; read?: boolean; search?: string; type?: string; workspace?: string }): Promise<Models.PaginatedAlertList>;

  /**
   * List alerts with filters.
   */
  async alertsList(...args: any[]): Promise<Models.PaginatedAlertList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], read: args[3], search: args[4], type: args[5], workspace: args[6] };
    }
    const response = await this.client.request('GET', "/api/system/alerts/", { params });
    return response;
  }

  /**
   * ViewSet for Alert operations. System notifications for important events.
   */
  async alertsCreate(data: Models.AlertCreateRequest): Promise<Models.AlertCreate> {
    const response = await this.client.request('POST', "/api/system/alerts/", { body: data });
    return response;
  }

  /**
   * ViewSet for Alert operations. System notifications for important events.
   */
  async alertsRetrieve(id: string): Promise<Models.Alert> {
    const response = await this.client.request('GET', `/api/system/alerts/${id}/`);
    return response;
  }

  /**
   * ViewSet for Alert operations. System notifications for important events.
   */
  async alertsUpdate(id: string, data: Models.AlertRequest): Promise<Models.Alert> {
    const response = await this.client.request('PUT', `/api/system/alerts/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for Alert operations. System notifications for important events.
   */
  async alertsPartialUpdate(id: string, data?: Models.PatchedAlertRequest): Promise<Models.Alert> {
    const response = await this.client.request('PATCH', `/api/system/alerts/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for Alert operations. System notifications for important events.
   */
  async alertsDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/system/alerts/${id}/`);
    return;
  }

  /**
   * Mark alert as read
   */
  async alertsMarkAsReadCreate(id: string): Promise<Models.Alert> {
    const response = await this.client.request('POST', `/api/system/alerts/${id}/mark-as-read/`);
    return response;
  }

  /**
   * Mark all unread alerts as read for current workspace
   */
  async alertsMarkAllAsReadCreate(): Promise<any> {
    const response = await this.client.request('POST', "/api/system/alerts/mark-all-as-read/");
    return response;
  }

  async apiKeysList(ordering?: string, page?: number, page_size?: number, search?: string, workspace?: string): Promise<Models.PaginatedApiKeyList>;
  async apiKeysList(params?: { ordering?: string; page?: number; page_size?: number; search?: string; workspace?: string }): Promise<Models.PaginatedApiKeyList>;

  /**
   * List API keys with filters.
   */
  async apiKeysList(...args: any[]): Promise<Models.PaginatedApiKeyList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], search: args[3], workspace: args[4] };
    }
    const response = await this.client.request('GET', "/api/system/api-keys/", { params });
    return response;
  }

  /**
   * Create new API key (raw key shown only once).
   */
  async apiKeysCreate(data: Models.ApiKeyCreateRequest): Promise<Models.ApiKeyResponse> {
    const response = await this.client.request('POST', "/api/system/api-keys/", { body: data });
    return response;
  }

  /**
   * ViewSet for ApiKey operations. Manage API keys for workspace
   * integrations. Note: Raw key is only shown once during creation.
   */
  async apiKeysRetrieve(id: string): Promise<Models.ApiKey> {
    const response = await this.client.request('GET', `/api/system/api-keys/${id}/`);
    return response;
  }

  /**
   * ViewSet for ApiKey operations. Manage API keys for workspace
   * integrations. Note: Raw key is only shown once during creation.
   */
  async apiKeysUpdate(id: string): Promise<Models.ApiKey> {
    const response = await this.client.request('PUT', `/api/system/api-keys/${id}/`);
    return response;
  }

  /**
   * ViewSet for ApiKey operations. Manage API keys for workspace
   * integrations. Note: Raw key is only shown once during creation.
   */
  async apiKeysPartialUpdate(id: string): Promise<Models.ApiKey> {
    const response = await this.client.request('PATCH', `/api/system/api-keys/${id}/`);
    return response;
  }

  /**
   * ViewSet for ApiKey operations. Manage API keys for workspace
   * integrations. Note: Raw key is only shown once during creation.
   */
  async apiKeysDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/system/api-keys/${id}/`);
    return;
  }

  /**
   * Regenerate API key (deletes old key and creates new one)
   */
  async apiKeysRegenerateCreate(id: string): Promise<Models.ApiKeyResponse> {
    const response = await this.client.request('POST', `/api/system/api-keys/${id}/regenerate/`);
    return response;
  }

}