import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSettings, configure, resetSettings } from '../src/config';

function withEnv(vars: Record<string, string>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, original] of Object.entries(saved)) {
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  }
}

describe('getSettings', () => {
  beforeEach(() => resetSettings());
  afterEach(() => resetSettings());

  describe('defaults', () => {
    it('should return default connectTimeoutMs', () => {
      expect(getSettings().connectTimeoutMs).toBe(10_000);
    });

    it('should return default requestTimeoutMs', () => {
      expect(getSettings().requestTimeoutMs).toBe(30_000);
    });

    it('should return default retryAttempts', () => {
      expect(getSettings().retryAttempts).toBe(5);
    });

    it('should return default retryTimeoutMs', () => {
      expect(getSettings().retryTimeoutMs).toBe(30_000);
    });

    it('should return default keepaliveIntervalMs', () => {
      expect(getSettings().keepaliveIntervalMs).toBe(25_000);
    });

    it('should return default queueMaxSize', () => {
      expect(getSettings().queueMaxSize).toBe(1_000);
    });

    it('should return default circuitBreakerFailMax', () => {
      expect(getSettings().circuitBreakerFailMax).toBe(5);
    });

    it('should return default circuitBreakerResetMs', () => {
      expect(getSettings().circuitBreakerResetMs).toBe(30_000);
    });

    it('should return default maxMessageSize (32 MB)', () => {
      expect(getSettings().maxMessageSize).toBe(32 * 1024 * 1024);
    });

    it('should return default grpcServer', () => {
      expect(getSettings().grpcServer).toBe('grpc.cmdop.com:443');
    });

    it('should return default apiBaseUrl', () => {
      expect(getSettings().apiBaseUrl).toBe('https://api.cmdop.com');
    });

    it('should return default logLevel "info"', () => {
      expect(getSettings().logLevel).toBe('info');
    });

    it('should return default logJson false', () => {
      expect(getSettings().logJson).toBe(false);
    });
  });

  describe('env var overrides', () => {
    it('should read CMDOP_CONNECT_TIMEOUT_MS', () => {
      withEnv({ CMDOP_CONNECT_TIMEOUT_MS: '5000' }, () => {
        resetSettings();
        expect(getSettings().connectTimeoutMs).toBe(5000);
      });
    });

    it('should read CMDOP_REQUEST_TIMEOUT_MS', () => {
      withEnv({ CMDOP_REQUEST_TIMEOUT_MS: '60000' }, () => {
        resetSettings();
        expect(getSettings().requestTimeoutMs).toBe(60_000);
      });
    });

    it('should read CMDOP_RETRY_ATTEMPTS', () => {
      withEnv({ CMDOP_RETRY_ATTEMPTS: '3' }, () => {
        resetSettings();
        expect(getSettings().retryAttempts).toBe(3);
      });
    });

    it('should read CMDOP_RETRY_TIMEOUT_MS', () => {
      withEnv({ CMDOP_RETRY_TIMEOUT_MS: '15000' }, () => {
        resetSettings();
        expect(getSettings().retryTimeoutMs).toBe(15_000);
      });
    });

    it('should read CMDOP_CIRCUIT_FAIL_MAX', () => {
      withEnv({ CMDOP_CIRCUIT_FAIL_MAX: '10' }, () => {
        resetSettings();
        expect(getSettings().circuitBreakerFailMax).toBe(10);
      });
    });

    it('should read CMDOP_CIRCUIT_RESET_TIMEOUT_MS', () => {
      withEnv({ CMDOP_CIRCUIT_RESET_TIMEOUT_MS: '60000' }, () => {
        resetSettings();
        expect(getSettings().circuitBreakerResetMs).toBe(60_000);
      });
    });

    it('should read CMDOP_GRPC_SERVER', () => {
      withEnv({ CMDOP_GRPC_SERVER: 'custom.host:443' }, () => {
        resetSettings();
        expect(getSettings().grpcServer).toBe('custom.host:443');
      });
    });

    it('should read CMDOP_API_BASE_URL', () => {
      withEnv({ CMDOP_API_BASE_URL: 'https://staging.cmdop.com' }, () => {
        resetSettings();
        expect(getSettings().apiBaseUrl).toBe('https://staging.cmdop.com');
      });
    });

    it('should read CMDOP_LOG_LEVEL', () => {
      withEnv({ CMDOP_LOG_LEVEL: 'debug' }, () => {
        resetSettings();
        expect(getSettings().logLevel).toBe('debug');
      });
    });

    it('should ignore invalid CMDOP_LOG_LEVEL', () => {
      withEnv({ CMDOP_LOG_LEVEL: 'verbose' }, () => {
        resetSettings();
        expect(getSettings().logLevel).toBe('info');
      });
    });

    it('should read CMDOP_LOG_JSON=true', () => {
      withEnv({ CMDOP_LOG_JSON: 'true' }, () => {
        resetSettings();
        expect(getSettings().logJson).toBe(true);
      });
    });

    it('should read CMDOP_LOG_JSON=1', () => {
      withEnv({ CMDOP_LOG_JSON: '1' }, () => {
        resetSettings();
        expect(getSettings().logJson).toBe(true);
      });
    });

    it('should ignore non-numeric CMDOP_RETRY_ATTEMPTS', () => {
      withEnv({ CMDOP_RETRY_ATTEMPTS: 'invalid' }, () => {
        resetSettings();
        expect(getSettings().retryAttempts).toBe(5);
      });
    });
  });

  describe('configure()', () => {
    it('should override a single setting', () => {
      configure({ connectTimeoutMs: 2000 });
      expect(getSettings().connectTimeoutMs).toBe(2000);
    });

    it('should override circuitBreakerFailMax', () => {
      configure({ circuitBreakerFailMax: 3 });
      expect(getSettings().circuitBreakerFailMax).toBe(3);
    });

    it('should override circuitBreakerResetMs', () => {
      configure({ circuitBreakerResetMs: 10_000 });
      expect(getSettings().circuitBreakerResetMs).toBe(10_000);
    });

    it('should merge multiple configure() calls', () => {
      configure({ retryAttempts: 2 });
      configure({ retryTimeoutMs: 5_000 });
      const s = getSettings();
      expect(s.retryAttempts).toBe(2);
      expect(s.retryTimeoutMs).toBe(5_000);
    });

    it('should not affect other settings when overriding one', () => {
      configure({ logLevel: 'warn' });
      expect(getSettings().retryAttempts).toBe(5);
    });

    it('configure() should take priority over env vars', () => {
      withEnv({ CMDOP_RETRY_ATTEMPTS: '10' }, () => {
        resetSettings();
        configure({ retryAttempts: 1 });
        expect(getSettings().retryAttempts).toBe(1);
      });
    });
  });

  describe('resetSettings()', () => {
    it('should restore defaults after configure()', () => {
      configure({ connectTimeoutMs: 1 });
      resetSettings();
      expect(getSettings().connectTimeoutMs).toBe(10_000);
    });

    it('should restore circuit breaker defaults', () => {
      configure({ circuitBreakerFailMax: 99, circuitBreakerResetMs: 1 });
      resetSettings();
      const s = getSettings();
      expect(s.circuitBreakerFailMax).toBe(5);
      expect(s.circuitBreakerResetMs).toBe(30_000);
    });

    it('should return a cached object on repeated calls', () => {
      const s1 = getSettings();
      const s2 = getSettings();
      expect(s1).toBe(s2);
    });

    it('should return a new object after resetSettings()', () => {
      const s1 = getSettings();
      resetSettings();
      const s2 = getSettings();
      expect(s1).not.toBe(s2);
    });
  });
});
