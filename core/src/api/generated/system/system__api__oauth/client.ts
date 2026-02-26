// @ts-nocheck
import * as Models from "./models";


/**
 * API endpoints for Oauth.
 */
export class SystemOauth {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Authorize device
   * 
   * User approves or denies device code in browser (requires
   * authentication).
   */
  async systemOauthAuthorizeCreate(data: Models.DeviceAuthorizeRequest): Promise<Models.DeviceAuthorizeResponse> {
    const response = await this.client.request('POST', "/api/system/oauth/authorize/", { body: data });
    return response;
  }

  /**
   * Request device code
   * 
   * CLI initiates OAuth flow by requesting a device code and user code.
   */
  async systemOauthDeviceCreate(data: Models.DeviceCodeRequestRequest): Promise<Models.DeviceCodeResponse> {
    const response = await this.client.request('POST', "/api/system/oauth/device/", { body: data });
    return response;
  }

  /**
   * Revoke token
   * 
   * Revoke access token or refresh token.
   */
  async systemOauthRevokeCreate(data: Models.TokenRevokeRequest): Promise<any> {
    const response = await this.client.request('POST', "/api/system/oauth/revoke/", { body: data });
    return response;
  }

  /**
   * Request access token
   * 
   * CLI polls for token (device flow) or refreshes expired token.
   */
  async systemOauthTokenCreate(data: Models.TokenRequestRequest): Promise<Models.TokenResponse> {
    const response = await this.client.request('POST', "/api/system/oauth/token/", { body: data });
    return response;
  }

  /**
   * Get token info
   * 
   * Get information about current access token (requires authentication).
   */
  async systemOauthTokenInfoRetrieve(): Promise<Models.TokenInfo> {
    const response = await this.client.request('GET', "/api/system/oauth/token/info/");
    return response;
  }

  async systemOauthTokensList(ordering?: string, page?: number, page_size?: number, search?: string): Promise<Models.PaginatedTokenListList>;
  async systemOauthTokensList(params?: { ordering?: string; page?: number; page_size?: number; search?: string }): Promise<Models.PaginatedTokenListList>;

  /**
   * List user tokens
   * 
   * List all CLI tokens for authenticated user.
   */
  async systemOauthTokensList(...args: any[]): Promise<Models.PaginatedTokenListList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], search: args[3] };
    }
    const response = await this.client.request('GET', "/api/system/oauth/tokens/", { params });
    return response;
  }

}