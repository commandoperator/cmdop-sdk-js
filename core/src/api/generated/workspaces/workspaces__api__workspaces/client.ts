import * as Models from "./models";


/**
 * API endpoints for Workspaces.
 */
export class WorkspacesWorkspaces {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  async invitationsList(ordering?: string, page?: number, page_size?: number, search?: string): Promise<Models.PaginatedWorkspaceInvitationList>;
  async invitationsList(params?: { ordering?: string; page?: number; page_size?: number; search?: string }): Promise<Models.PaginatedWorkspaceInvitationList>;

  /**
   * List invitations
   * 
   * List all pending invitations for workspaces you manage
   */
  async invitationsList(...args: any[]): Promise<Models.PaginatedWorkspaceInvitationList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], search: args[3] };
    }
    const response = await this.client.request('GET', "/api/workspaces/invitations/", { params });
    return response;
  }

  /**
   * Create invitation
   * 
   * Invite a user to a workspace by email
   */
  async invitationsCreate(data: Models.WorkspaceInvitationCreateRequest): Promise<Models.WorkspaceInvitation> {
    const response = await this.client.request('POST', "/api/workspaces/invitations/", { body: data });
    return response;
  }

  /**
   * Get invitation details
   * 
   * Get details of a specific invitation
   */
  async invitationsRetrieve(id: string): Promise<Models.WorkspaceInvitation> {
    const response = await this.client.request('GET', `/api/workspaces/invitations/${id}/`);
    return response;
  }

  /**
   * Cancel invitation
   * 
   * Cancel a pending invitation
   */
  async invitationsDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/workspaces/invitations/${id}/`);
    return;
  }

  /**
   * Resend invitation
   * 
   * Resend invitation email and regenerate token
   */
  async invitationsResendCreate(id: string, data: Models.WorkspaceInvitationRequest): Promise<Models.WorkspaceInvitation> {
    const response = await this.client.request('POST', `/api/workspaces/invitations/${id}/resend/`, { body: data });
    return response;
  }

  /**
   * Accept invitation
   * 
   * Accept a workspace invitation
   */
  async invitationsAcceptCreate(data: Models.WorkspaceInvitationAcceptRequest): Promise<any> {
    const response = await this.client.request('POST', "/api/workspaces/invitations/accept/", { body: data });
    return response;
  }

  /**
   * Decline invitation
   * 
   * Decline a workspace invitation (no auth required)
   */
  async invitationsDeclineCreate(data: Models.WorkspaceInvitationAcceptRequest): Promise<any> {
    const response = await this.client.request('POST', "/api/workspaces/invitations/decline/", { body: data });
    return response;
  }

  /**
   * Get invitation details by token
   * 
   * Get public invitation details for accept page (no auth required)
   */
  async invitationsDetailsRetrieve(token: string): Promise<Models.WorkspaceInvitationPublic> {
    const response = await this.client.request('GET', `/api/workspaces/invitations/details/${token}/`);
    return response;
  }

  async membersList(ordering?: string, page?: number, page_size?: number, role?: string, search?: string): Promise<Models.PaginatedWorkspaceMemberList>;
  async membersList(params?: { ordering?: string; page?: number; page_size?: number; role?: string; search?: string }): Promise<Models.PaginatedWorkspaceMemberList>;

  /**
   * List workspace members with optional search and role filters.
   */
  async membersList(...args: any[]): Promise<Models.PaginatedWorkspaceMemberList> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], page: args[1], page_size: args[2], role: args[3], search: args[4] };
    }
    const response = await this.client.request('GET', "/api/workspaces/members/", { params });
    return response;
  }

  /**
   * ViewSet for WorkspaceMember operations. Manage workspace memberships and
   * roles.
   */
  async membersCreate(data: Models.WorkspaceMemberRequest): Promise<Models.WorkspaceMember> {
    const response = await this.client.request('POST', "/api/workspaces/members/", { body: data });
    return response;
  }

  /**
   * ViewSet for WorkspaceMember operations. Manage workspace memberships and
   * roles.
   */
  async membersRetrieve(id: string): Promise<Models.WorkspaceMember> {
    const response = await this.client.request('GET', `/api/workspaces/members/${id}/`);
    return response;
  }

  /**
   * ViewSet for WorkspaceMember operations. Manage workspace memberships and
   * roles.
   */
  async membersUpdate(id: string, data: Models.WorkspaceMemberRequest): Promise<Models.WorkspaceMember> {
    const response = await this.client.request('PUT', `/api/workspaces/members/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for WorkspaceMember operations. Manage workspace memberships and
   * roles.
   */
  async membersPartialUpdate(id: string, data?: Models.PatchedWorkspaceMemberRequest): Promise<Models.WorkspaceMember> {
    const response = await this.client.request('PATCH', `/api/workspaces/members/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for WorkspaceMember operations. Manage workspace memberships and
   * roles.
   */
  async membersDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/workspaces/members/${id}/`);
    return;
  }

  /**
   * Update member role
   * 
   * Update workspace member role.
   */
  async membersUpdateRoleCreate(id: string, data: Models.WorkspaceMemberRequest): Promise<Models.WorkspaceMember> {
    const response = await this.client.request('POST', `/api/workspaces/members/${id}/update-role/`, { body: data });
    return response;
  }

  async workspacesList(ordering?: string, search?: string): Promise<any>;
  async workspacesList(params?: { ordering?: string; search?: string }): Promise<any>;

  /**
   * ViewSet for Workspace operations. Provides CRUD operations for
   * workspaces with team/personal modes.
   */
  async workspacesList(...args: any[]): Promise<any> {
    const isParamsObject = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]);
    
    let params;
    if (isParamsObject) {
      params = args[0];
    } else {
      params = { ordering: args[0], search: args[1] };
    }
    const response = await this.client.request('GET', "/api/workspaces/workspaces/", { params });
    return (response as any).results || response;
  }

  /**
   * Create new workspace
   * 
   * Create workspace and return full workspace data.
   */
  async workspacesCreate(data: Models.WorkspaceCreateRequest): Promise<Models.Workspace> {
    const response = await this.client.request('POST', "/api/workspaces/workspaces/", { body: data });
    return response;
  }

  /**
   * ViewSet for Workspace operations. Provides CRUD operations for
   * workspaces with team/personal modes.
   */
  async workspacesRetrieve(id: string): Promise<Models.Workspace> {
    const response = await this.client.request('GET', `/api/workspaces/workspaces/${id}/`);
    return response;
  }

  /**
   * ViewSet for Workspace operations. Provides CRUD operations for
   * workspaces with team/personal modes.
   */
  async workspacesUpdate(id: string, data: Models.WorkspaceRequest): Promise<Models.Workspace> {
    const response = await this.client.request('PUT', `/api/workspaces/workspaces/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for Workspace operations. Provides CRUD operations for
   * workspaces with team/personal modes.
   */
  async workspacesPartialUpdate(id: string, data?: Models.PatchedWorkspaceRequest): Promise<Models.Workspace> {
    const response = await this.client.request('PATCH', `/api/workspaces/workspaces/${id}/`, { body: data });
    return response;
  }

  /**
   * ViewSet for Workspace operations. Provides CRUD operations for
   * workspaces with team/personal modes.
   */
  async workspacesDestroy(id: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/workspaces/workspaces/${id}/`);
    return;
  }

  /**
   * List workspace members
   * 
   * Get all members of this workspace.
   */
  async workspacesMembersRetrieve(id: string): Promise<any> {
    const response = await this.client.request('GET', `/api/workspaces/workspaces/${id}/members/`);
    return response;
  }

  /**
   * Get workspace statistics
   * 
   * Get workspace statistics.
   */
  async workspacesStatsRetrieve(id: string): Promise<any> {
    const response = await this.client.request('GET', `/api/workspaces/workspaces/${id}/stats/`);
    return response;
  }

}