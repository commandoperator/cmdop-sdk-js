/**
 * Generated API Client
 * Auto-generated thin wrapper - DO NOT EDIT
 *
 * @generated 2026-01-25T04:56:47.477899
 */

import type {
  WsBrowserExecuteScriptParams,
  WsBrowserExecuteScriptResult,
  WsBrowserExtractDataParams,
  WsBrowserExtractDataResult,
  WsBrowserExtractRegexParams,
  WsBrowserExtractRegexResult,
  WsBrowserValidateSelectorsParams,
  WsBrowserValidateSelectorsResult,
  WsCancelTransferParams,
  WsCancelTransferResult,
  WsChannelAuthParams,
  WsChannelAuthResult,
  WsChatCreateSessionParams,
  WsChatSessionResult,
  WsCheckVersionParams,
  WsCreateArchiveParams,
  WsCreateArchiveResult,
  WsCreateDirectoryParams,
  WsCreateDirectoryResult,
  WsDeleteParams,
  WsDeleteResult,
  WsGetChangesParams,
  WsGetChangesResult,
  WsGetFileInfoParams,
  WsGetFileInfoResult,
  WsGetHistoryParams,
  WsGetSessionParams,
  WsHistoryResult,
  WsInitiateTransferParams,
  WsInitiateTransferResult,
  WsListDirectoryParams,
  WsListDirectoryResult,
  WsListSessionsParams,
  WsListTransfersParams,
  WsListTransfersResult,
  WsMessageListResult,
  WsMessageResult,
  WsMoveParams,
  WsMoveResult,
  WsReadFileParams,
  WsReadFileResult,
  WsSearchParams,
  WsSearchResult,
  WsSendMessageParams,
  WsSessionListResult,
  WsSessionResult,
  WsSuccessResult,
  WsTerminalCloseParams,
  WsTerminalCreateSessionParams,
  WsTerminalHistoryParams,
  WsTerminalInputParams,
  WsTerminalResizeParams,
  WsTerminalSignalParams,
  WsTransferStatusParams,
  WsTransferStatusResult,
  WsVersionCheckResult,
  WsWriteFileParams,
  WsWriteFileResult,
} from './types';

/**
 * API contract version - changes when methods or models change.
 * Use checkVersion() to verify client/server compatibility.
 */
export const API_VERSION = '5e38751f';

/**
 * Timestamp when this client was generated.
 */
export const GENERATED_AT = '2026-01-25T04:56:47.477899';

// Interface for Centrifugo client with namedRPC
// Compatible with @djangocfg/centrifugo client
interface CentrifugoClient {
  namedRPC<T = any>(method: string, params: any, options?: { timeout?: number }): Promise<T>;
  /** Optional: fire-and-forget RPC (no response expected) */
  namedRPCNoWait?(method: string, params: any): void;
}

// Re-export WsVersionCheckResult from types (generated from Pydantic model)
export type { WsVersionCheckResult } from './types';

export class APIClient {
  constructor(private client: CentrifugoClient) {}

  /**
   * Check if client API version is compatible with server.
   * Call this after connecting to ensure contract compatibility.
   *
   * @throws Error if versions are incompatible
   * @returns WsVersionCheckResult with compatibility info
   *
   * @example
   * const apiClient = new APIClient(client);
   * const result = await apiClient.checkVersion();
   * if (!result.compatible) {
   *   console.error('API version mismatch! Please regenerate client.');
   * }
   */
  async checkVersion(): Promise<WsVersionCheckResult> {
    try {
      const result = await this.client.namedRPC<WsVersionCheckResult>(
        'system.check_version',
        { client_version: API_VERSION }
      );
      return result;
    } catch (error) {
      // If endpoint doesn't exist, assume compatible (for backwards compatibility)
      return {
        compatible: true,
        client_version: API_VERSION,
        server_version: 'unknown',
        message: 'Version check endpoint not available',
      };
    }
  }

  /**
   * Get the API contract version of this client.
   */
  getVersion(): string {
    return API_VERSION;
  }

  /**
   * Send input to terminal session (fire-and-forget).
   */
  async terminalInput(params: WsTerminalInputParams): Promise<WsSuccessResult> {
    return this.client.namedRPC<WsSuccessResult>('terminal.input', params);
  }

  /**
   * Send input to terminal session (fire-and-forget). (fire-and-forget)
   */
  terminalInputNoWait(params: WsTerminalInputParams): void {
    // Fire-and-forget: don't wait for response
    if (this.client.namedRPCNoWait) {
      this.client.namedRPCNoWait('terminal.input', params);
    } else {
      this.client.namedRPC('terminal.input', params).catch(() => {});
    }
  }

  /**
   * Resize terminal (fire-and-forget).
   */
  async terminalResize(params: WsTerminalResizeParams): Promise<WsSuccessResult> {
    return this.client.namedRPC<WsSuccessResult>('terminal.resize', params);
  }

  /**
   * Resize terminal (fire-and-forget). (fire-and-forget)
   */
  terminalResizeNoWait(params: WsTerminalResizeParams): void {
    // Fire-and-forget: don't wait for response
    if (this.client.namedRPCNoWait) {
      this.client.namedRPCNoWait('terminal.resize', params);
    } else {
      this.client.namedRPC('terminal.resize', params).catch(() => {});
    }
  }

  /**
   * Send signal to terminal process.
   */
  async terminalSignal(params: WsTerminalSignalParams): Promise<WsSuccessResult> {
    return this.client.namedRPC<WsSuccessResult>('terminal.signal', params);
  }

  /**
   * Close terminal session.
   */
  async terminalClose(params: WsTerminalCloseParams): Promise<WsSuccessResult> {
    return this.client.namedRPC<WsSuccessResult>('terminal.close', params);
  }

  /**
   * Create new terminal session.
   */
  async terminalCreateSession(params: WsTerminalCreateSessionParams): Promise<WsSessionResult> {
    return this.client.namedRPC<WsSessionResult>('terminal.create_session', params);
  }

  /**
   * Get terminal session info.
   */
  async terminalGetSession(params: WsGetSessionParams): Promise<WsSessionResult> {
    return this.client.namedRPC<WsSessionResult>('terminal.get_session', params);
  }

  /**
   * List user's terminal sessions.
   */
  async terminalListSessions(params: WsListSessionsParams): Promise<WsSessionListResult> {
    return this.client.namedRPC<WsSessionListResult>('terminal.list_sessions', params);
  }

  /**
   * Get terminal command history.
   */
  async terminalHistory(params: WsTerminalHistoryParams): Promise<WsHistoryResult> {
    return this.client.namedRPC<WsHistoryResult>('terminal.history', params);
  }

  /**
   * List directory contents via gRPC.
   */
  async fileListDirectory(params: WsListDirectoryParams): Promise<WsListDirectoryResult> {
    return this.client.namedRPC<WsListDirectoryResult>('file.list_directory', params);
  }

  /**
   * Create a new directory via gRPC.
   */
  async fileCreateDirectory(params: WsCreateDirectoryParams): Promise<WsCreateDirectoryResult> {
    return this.client.namedRPC<WsCreateDirectoryResult>('file.create_directory', params);
  }

  /**
   * Read file contents via gRPC.
   */
  async fileRead(params: WsReadFileParams): Promise<WsReadFileResult> {
    return this.client.namedRPC<WsReadFileResult>('file.read', params);
  }

  /**
   * Write file contents via gRPC.
   */
  async fileWrite(params: WsWriteFileParams): Promise<WsWriteFileResult> {
    return this.client.namedRPC<WsWriteFileResult>('file.write', params);
  }

  /**
   * Delete a file or directory via gRPC.
   */
  async fileDelete(params: WsDeleteParams): Promise<WsDeleteResult> {
    return this.client.namedRPC<WsDeleteResult>('file.delete', params);
  }

  /**
   * Move or rename a file or directory via gRPC.
   */
  async fileMove(params: WsMoveParams): Promise<WsMoveResult> {
    return this.client.namedRPC<WsMoveResult>('file.move', params);
  }

  /**
   * Get file or directory info via gRPC.
   */
  async fileGetInfo(params: WsGetFileInfoParams): Promise<WsGetFileInfoResult> {
    return this.client.namedRPC<WsGetFileInfoResult>('file.get_info', params);
  }

  /**
   * Create archive from selected files via gRPC.
   */
  async fileCreateArchive(params: WsCreateArchiveParams): Promise<WsCreateArchiveResult> {
    return this.client.namedRPC<WsCreateArchiveResult>('file.create_archive', params);
  }

  /**
   * Search files by filename pattern and/or content via gRPC.
   */
  async fileSearch(params: WsSearchParams): Promise<WsSearchResult> {
    return this.client.namedRPC<WsSearchResult>('file.search', params);
  }

  /**
   * Get file changes since a sequence number.
   */
  async fileGetChanges(params: WsGetChangesParams): Promise<WsGetChangesResult> {
    return this.client.namedRPC<WsGetChangesResult>('file.get_changes', params);
  }

  /**
   * Initiate a cross-device file transfer via streaming relay.
   */
  async transferInitiate(params: WsInitiateTransferParams): Promise<WsInitiateTransferResult> {
    return this.client.namedRPC<WsInitiateTransferResult>('transfer.initiate', params);
  }

  /**
   * Get status of a cross-device transfer.
   */
  async transferStatus(params: WsTransferStatusParams): Promise<WsTransferStatusResult> {
    return this.client.namedRPC<WsTransferStatusResult>('transfer.status', params);
  }

  /**
   * Cancel a cross-device transfer.
   */
  async transferCancel(params: WsCancelTransferParams): Promise<WsCancelTransferResult> {
    return this.client.namedRPC<WsCancelTransferResult>('transfer.cancel', params);
  }

  /**
   * List active transfers for a session.
   */
  async transferList(params: WsListTransfersParams): Promise<WsListTransfersResult> {
    return this.client.namedRPC<WsListTransfersResult>('transfer.list', params);
  }

  /**
   * Validate CSS selectors on current browser page.
   */
  async browserValidateSelectors(params: WsBrowserValidateSelectorsParams): Promise<WsBrowserValidateSelectorsResult> {
    return this.client.namedRPC<WsBrowserValidateSelectorsResult>('browser.validate_selectors', params);
  }

  /**
   * Extract structured data from browser page.
   */
  async browserExtractData(params: WsBrowserExtractDataParams): Promise<WsBrowserExtractDataResult> {
    return this.client.namedRPC<WsBrowserExtractDataResult>('browser.extract_data', params);
  }

  /**
   * Execute JavaScript in browser.
   */
  async browserExecuteScript(params: WsBrowserExecuteScriptParams): Promise<WsBrowserExecuteScriptResult> {
    return this.client.namedRPC<WsBrowserExecuteScriptResult>('browser.execute_script', params);
  }

  /**
   * Extract data from page using regex.
   */
  async browserExtractRegex(params: WsBrowserExtractRegexParams): Promise<WsBrowserExtractRegexResult> {
    return this.client.namedRPC<WsBrowserExtractRegexResult>('browser.extract_regex', params);
  }

  /**
   * Check if client API version is compatible with server.
   */
  async systemCheckVersion(params: WsCheckVersionParams): Promise<WsVersionCheckResult> {
    return this.client.namedRPC<WsVersionCheckResult>('system.check_version', params);
  }

  /**
   * Authorize access to a channel.
   */
  async channelAuthorize(params: WsChannelAuthParams): Promise<WsChannelAuthResult> {
    return this.client.namedRPC<WsChannelAuthResult>('channel.authorize', params);
  }

  /**
   * Send a chat message for AI processing.
   */
  async aiChatSendMessage(params: WsSendMessageParams): Promise<WsMessageResult> {
    // AI methods use longer timeout (60s) for safety, though RPC returns immediately
    return this.client.namedRPC<WsMessageResult>('ai_chat.send_message', params, { timeout: 60000 });
  }

  /**
   * Get message history for a workspace or session.
   */
  async aiChatGetHistory(params: WsGetHistoryParams): Promise<WsMessageListResult> {
    // AI methods use longer timeout (60s) for safety, though RPC returns immediately
    return this.client.namedRPC<WsMessageListResult>('ai_chat.get_history', params, { timeout: 60000 });
  }

  /**
   * Create a new chat session.
   */
  async aiChatCreateSession(params: WsChatCreateSessionParams): Promise<WsChatSessionResult> {
    // AI methods use longer timeout (60s) for safety, though RPC returns immediately
    return this.client.namedRPC<WsChatSessionResult>('ai_chat.create_session', params, { timeout: 60000 });
  }

}