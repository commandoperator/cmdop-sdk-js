/**
 * SDK configuration system
 *
 * Settings are read from environment variables (CMDOP_* prefix).
 * Use configure() for programmatic override.
 *
 * Priority: configure() overrides > env vars > defaults
 */

export interface SDKSettings {
  // Connection
  /** gRPC connect timeout in ms (default: 10000) */
  connectTimeoutMs: number;
  /** Per-request timeout in ms (default: 30000) */
  requestTimeoutMs: number;

  // Retry
  /** Max retry attempts for transient failures (default: 5) */
  retryAttempts: number;
  /** Total retry window in ms (default: 30000) */
  retryTimeoutMs: number;

  // Streaming / keepalive
  /** Keepalive ping interval in ms (default: 25000) */
  keepaliveIntervalMs: number;
  /** Max outbound queue size for streaming (default: 1000) */
  queueMaxSize: number;

  // Circuit breaker
  /** Max consecutive failures before circuit opens (default: 5) */
  circuitBreakerFailMax: number;
  /** Time in ms before circuit half-opens after tripping (default: 30000) */
  circuitBreakerResetMs: number;

  // gRPC transport
  /** Max gRPC message size in bytes (default: 32 MB) */
  maxMessageSize: number;

  // Endpoints
  /** Remote gRPC server address (default: grpc.cmdop.com:443) */
  grpcServer: string;
  /** REST API base URL (default: https://api.cmdop.com) */
  apiBaseUrl: string;

  // Logging
  /** Log level: 'debug' | 'info' | 'warn' | 'error' | 'silent' (default: 'info') */
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  /** Emit structured JSON logs (default: false) */
  logJson: boolean;
}

const DEFAULTS: SDKSettings = {
  connectTimeoutMs: 10_000,
  requestTimeoutMs: 30_000,
  retryAttempts: 5,
  retryTimeoutMs: 30_000,
  keepaliveIntervalMs: 25_000,
  queueMaxSize: 1_000,
  circuitBreakerFailMax: 5,
  circuitBreakerResetMs: 30_000,
  maxMessageSize: 32 * 1024 * 1024,
  grpcServer: 'grpc.cmdop.com:443',
  apiBaseUrl: 'https://api.cmdop.com',
  logLevel: 'info',
  logJson: false,
};

function readFromEnv(): Partial<SDKSettings> {
  const env = process.env;
  const out: Partial<SDKSettings> = {};

  const num = (key: string) => {
    const v = env[key];
    if (v !== undefined) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
    return undefined;
  };

  const bool = (key: string) => {
    const v = env[key];
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  };

  const str = (key: string) => env[key];

  const logLevel = str('CMDOP_LOG_LEVEL');
  if (logLevel && ['debug', 'info', 'warn', 'error', 'silent'].includes(logLevel)) {
    out.logLevel = logLevel as SDKSettings['logLevel'];
  }

  const connectTimeout = num('CMDOP_CONNECT_TIMEOUT_MS');
  if (connectTimeout !== undefined) out.connectTimeoutMs = connectTimeout;

  const requestTimeout = num('CMDOP_REQUEST_TIMEOUT_MS');
  if (requestTimeout !== undefined) out.requestTimeoutMs = requestTimeout;

  const retryAttempts = num('CMDOP_RETRY_ATTEMPTS');
  if (retryAttempts !== undefined) out.retryAttempts = retryAttempts;

  const retryTimeout = num('CMDOP_RETRY_TIMEOUT_MS');
  if (retryTimeout !== undefined) out.retryTimeoutMs = retryTimeout;

  const keepalive = num('CMDOP_KEEPALIVE_INTERVAL_MS');
  if (keepalive !== undefined) out.keepaliveIntervalMs = keepalive;

  const queueSize = num('CMDOP_QUEUE_MAX_SIZE');
  if (queueSize !== undefined) out.queueMaxSize = queueSize;

  const circuitFailMax = num('CMDOP_CIRCUIT_FAIL_MAX');
  if (circuitFailMax !== undefined) out.circuitBreakerFailMax = circuitFailMax;

  const circuitResetMs = num('CMDOP_CIRCUIT_RESET_TIMEOUT_MS');
  if (circuitResetMs !== undefined) out.circuitBreakerResetMs = circuitResetMs;

  const maxMsg = num('CMDOP_MAX_MESSAGE_SIZE');
  if (maxMsg !== undefined) out.maxMessageSize = maxMsg;

  const grpcServer = str('CMDOP_GRPC_SERVER');
  if (grpcServer) out.grpcServer = grpcServer;

  const apiBaseUrl = str('CMDOP_API_BASE_URL');
  if (apiBaseUrl) out.apiBaseUrl = apiBaseUrl;

  const logJson = bool('CMDOP_LOG_JSON');
  if (logJson !== undefined) out.logJson = logJson;

  return out;
}

let _override: Partial<SDKSettings> | null = null;
let _cached: SDKSettings | null = null;

/**
 * Get current SDK settings (singleton, cached).
 * Merges: defaults < env vars < configure() overrides
 */
export function getSettings(): SDKSettings {
  if (!_cached) {
    _cached = { ...DEFAULTS, ...readFromEnv(), ...(_override ?? {}) };
  }
  return _cached;
}

/**
 * Override settings programmatically.
 * Useful for testing or when env vars are not available.
 *
 * @example
 * ```typescript
 * configure({ requestTimeoutMs: 60_000, logLevel: 'debug' });
 * ```
 */
export function configure(overrides: Partial<SDKSettings>): void {
  _override = { ...(_override ?? {}), ...overrides };
  _cached = null; // invalidate cache
}

/**
 * Reset settings to defaults + env vars (removes configure() overrides).
 * Primarily for testing.
 */
export function resetSettings(): void {
  _override = null;
  _cached = null;
}
