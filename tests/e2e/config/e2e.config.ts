/**
 * E2E Test Configuration
 * Centralized configuration for all E2E test settings
 */

export const E2E_CONFIG = {
  // Server ports - must match .env.e2e
  ports: {
    backend: parseInt(process.env.E2E_PORT || process.env.PORT || '3110', 10),
    frontend: parseInt(process.env.E2E_CLIENT_PORT || process.env.CLIENT_PORT || '3120', 10),
  },

  // URLs
  urls: {
    get backend() {
      return `http://localhost:${E2E_CONFIG.ports.backend}`;
    },
    get frontend() {
      return `http://localhost:${E2E_CONFIG.ports.frontend}`;
    },
    get health() {
      return `${this.backend}/api/health`;
    },
  },

  // Timeouts (in milliseconds)
  timeouts: {
    serverStartup: 60000,    // 60 seconds for server to start
    pageLoad: 30000,         // 30 seconds for page to load
    navigation: 30000,       // 30 seconds for navigation
    healthCheck: 5000,       // 5 seconds for health check
    retryDelay: 1000,        // 1 second between retries
  },

  // Retry configuration
  retries: {
    serverStartup: 60,       // 60 attempts for server startup
    healthCheck: 10,         // 10 attempts for health check
    pageLoad: 5,             // 5 attempts for page load
  },

  // Test data prefixes
  testData: {
    prefix: 'e2e-test',
    runIdPrefix: 'e2e',
  },

  // Database configuration
  database: {
    url: ':memory:',
    filename: ':memory:',
  },

  // Authentication
  auth: {
    storageStatePath: './tests/e2e/.auth/storage-state.json',
  },

  // Logging
  logging: {
    dir: '/tmp/capacinator-logs',
    backendLog: 'e2e-backend.log',
    frontendLog: 'e2e-frontend.log',
  },

  // Process management
  process: {
    pidDir: '/tmp',
    backendPidFile: 'e2e-backend.pid',
    frontendPidFile: 'e2e-frontend.pid',
  },

  // Environment detection
  isCI: !!process.env.CI,
  isDevelopment: process.env.NODE_ENV === 'development',
  isE2E: process.env.NODE_ENV === 'e2e',

  // Feature flags
  features: {
    useExistingServers: process.env.E2E_USE_EXISTING_SERVERS === 'true',
    verbose: process.env.E2E_VERBOSE === 'true',
    headed: process.env.HEADED === 'true',
  },
};

// Helper functions
export const e2eHelpers = {
  /**
   * Check if a URL is accessible
   */
  async isUrlAccessible(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(E2E_CONFIG.timeouts.healthCheck),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Wait for a condition with retries
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    options: {
      timeout?: number;
      retryDelay?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const {
      timeout = E2E_CONFIG.timeouts.serverStartup,
      retryDelay = E2E_CONFIG.timeouts.retryDelay,
      message = 'Condition not met',
    } = options;

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    throw new Error(`Timeout: ${message}`);
  },

  /**
   * Get process IDs from PID files
   */
  getPids(): { backend?: number; frontend?: number } {
    const fs = require('fs');
    const path = require('path');
    const pids: { backend?: number; frontend?: number } = {};

    try {
      const backendPidPath = path.join(E2E_CONFIG.process.pidDir, E2E_CONFIG.process.backendPidFile);
      if (fs.existsSync(backendPidPath)) {
        pids.backend = parseInt(fs.readFileSync(backendPidPath, 'utf8'));
      }
    } catch {
      // Ignore
    }

    try {
      const frontendPidPath = path.join(E2E_CONFIG.process.pidDir, E2E_CONFIG.process.frontendPidFile);
      if (fs.existsSync(frontendPidPath)) {
        pids.frontend = parseInt(fs.readFileSync(frontendPidPath, 'utf8'));
      }
    } catch {
      // Ignore
    }

    return pids;
  },

  /**
   * Log with timestamp
   */
  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      warn: '⚠️',
      error: '❌',
    }[level];
    console.log(`[${timestamp}] ${prefix} ${message}`);
  },
};

export default E2E_CONFIG;