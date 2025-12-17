/**
 * Centralized Environment Configuration
 *
 * This module provides a single source of truth for all environment variables
 * used throughout the application. It validates all required variables at
 * startup and provides typed configuration objects.
 *
 * Configuration is organized by feature:
 * - app: Basic application settings
 * - server: Server configuration
 * - database: Database configuration
 * - audit: Audit logging configuration
 * - logging: Application logging configuration
 * - email: Email service configuration
 * - auth: Authentication configuration
 * - security: Security-related configuration
 *
 * Usage:
 *   import { config } from './environment';
 *   const port = config.server.port;
 *   const dbUrl = config.database.url;
 */

// ============================================================================
// Configuration Validation & Parsing
// ============================================================================

/**
 * Parse string to integer with optional default
 */
function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value: "${value}"`);
  }
  return parsed;
}

/**
 * Parse string to boolean (true if "true", false otherwise)
 */
function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Validate that a required environment variable is set
 */
function requireEnv(name: string, message?: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(message || `Required environment variable not set: ${name}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// ============================================================================
// Configuration Objects
// ============================================================================

/**
 * Application environment (development, production, test, e2e)
 */
export type NodeEnv = 'development' | 'production' | 'test' | 'e2e';

const nodeEnv = (process.env.NODE_ENV as NodeEnv) || 'development';

// Validate NODE_ENV
if (!['development', 'production', 'test', 'e2e'].includes(nodeEnv)) {
  throw new Error(
    `Invalid NODE_ENV: "${nodeEnv}". Must be one of: development, production, test, e2e`
  );
}

/**
 * Basic application configuration
 */
const app = {
  /** Current environment (development, production, test, e2e) */
  env: nodeEnv,

  /** Whether running in development */
  isDevelopment: nodeEnv === 'development',

  /** Whether running in production */
  isProduction: nodeEnv === 'production',

  /** Whether running in test mode */
  isTest: nodeEnv === 'test',

  /** Whether running in e2e test mode */
  isE2E: nodeEnv === 'e2e',

  /** Application name/service identifier */
  serviceName: getEnv('SERVICE_NAME', 'Capacinator'),

  /** Application URL (used for links, etc.) */
  appUrl: getEnv('APP_URL', 'http://localhost:3120'),
};

/**
 * Server configuration
 */
const server = {
  /** Server port */
  port: parseInteger(process.env.PORT, 3110),

  /** Maximum file upload size in bytes */
  maxFileSize: parseInteger(process.env.MAX_FILE_SIZE, 52428800), // 50MB default

  /** Whether to enable debug logging */
  debugMock: parseBoolean(process.env.DEBUG_MOCK, false),
};

/**
 * Database configuration
 */
const database = {
  /** Database filename/path */
  filename: getEnv('DB_FILENAME', 'capacinator-dev.db'),

  /** Database URL (for PostgreSQL, etc. if used) */
  url: getEnv('DATABASE_URL', ''),

  /** Database backup retention days */
  backupRetentionDays: parseInteger(process.env.DB_BACKUP_RETENTION_DAYS, 30),
};

/**
 * Audit logging configuration
 */
const audit = {
  /** Whether audit logging is enabled */
  enabled: parseBoolean(process.env.AUDIT_ENABLED, true),

  /** Comma-separated list of tables to audit */
  enabledTables: getEnv(
    'AUDIT_ENABLED_TABLES',
    'projects,people,roles,assignments,project_phases'
  ),

  /** Maximum audit history entries to keep per entity */
  maxHistoryEntries: parseInteger(process.env.AUDIT_MAX_HISTORY_ENTRIES, 1000),

  /** Audit log retention days */
  retentionDays: parseInteger(process.env.AUDIT_RETENTION_DAYS, 90),

  /** Comma-separated list of sensitive fields to mask */
  sensitiveFields: getEnv(
    'AUDIT_SENSITIVE_FIELDS',
    'password,token,secret,key,hash,ssn,credit_card'
  ),
};

/**
 * Application logging configuration
 */
const logging = {
  /** Log level (error, warn, info, http, debug) */
  level: getEnv('LOG_LEVEL', 'info'),

  /** Log format (json or text) */
  format: getEnv('LOG_FORMAT', 'text'),

  /** Directory for log files */
  directory: getEnv('LOG_DIRECTORY', './logs'),

  /** Maximum log file size in bytes */
  maxFileSize: getEnv('LOG_MAX_FILE_SIZE', '10485760'),

  /** Maximum number of log files to keep */
  maxFiles: getEnv('LOG_MAX_FILES', '10'),

  /** Whether to enable test logging (for debugging tests) */
  enableTestLogs: parseBoolean(process.env.ENABLE_TEST_LOGS, false),
};

/**
 * Email service configuration
 */
const email = {
  /** SMTP host */
  host: getEnv('SMTP_HOST', 'localhost'),

  /** SMTP port */
  port: parseInteger(process.env.SMTP_PORT, 587),

  /** SMTP username */
  user: getEnv('SMTP_USER', ''),

  /** SMTP password */
  password: getEnv('SMTP_PASS', ''),

  /** SMTP from email address */
  from: getEnv('SMTP_FROM', 'noreply@example.com'),

  /** Whether to use SMTP secure connection (TLS) */
  secure: parseBoolean(process.env.SMTP_SECURE, false),

  /** Whether email sending is configured */
  get isConfigured(): boolean {
    return !!(email.host && email.user && email.password);
  },
};

/**
 * Authentication configuration
 */
const auth = {
  /** JWT secret (MUST be set in production) */
  jwtSecret:
    nodeEnv === 'production'
      ? requireEnv('JWT_SECRET', 'JWT_SECRET is required in production')
      : getEnv('JWT_SECRET', 'dev-jwt-secret-change-in-production'),

  /** JWT token expiration time */
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1h'),

  /** JWT refresh token expiration time */
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
};

/**
 * Security configuration
 */
const security = {
  /** Whether to validate required variables at startup */
  validateOnStartup: true,

  /** Required environment variables that must be set */
  required: [
    ...(nodeEnv === 'production'
      ? ['JWT_SECRET'] // Required in production
      : []),
  ],
};

// ============================================================================
// Unified Configuration Export
// ============================================================================

/**
 * Complete application configuration object
 */
export const config = {
  app,
  server,
  database,
  audit,
  logging,
  email,
  auth,
  security,

  // Legacy compatibility - simple getters for common variables
  get env(): NodeEnv {
    return app.env;
  },
  get port(): number {
    return server.port;
  },
  get isDevelopment(): boolean {
    return app.isDevelopment;
  },
  get isProduction(): boolean {
    return app.isProduction;
  },
  get isTest(): boolean {
    return app.isTest;
  },
  get isE2E(): boolean {
    return app.isE2E;
  },
  get features() {
    return {
      get audit() {
        return audit.enabled || app.isE2E;
      },
    };
  },
};

/**
 * Validate all required configuration at startup
 * Call this from the application entry point to fail fast
 */
export function validateConfiguration(): void {
  const errors: string[] = [];

  // Check all required env vars are set
  for (const envVar of security.required) {
    if (!process.env[envVar]) {
      errors.push(`Required environment variable not set: ${envVar}`);
    }
  }

  // Production-specific checks
  if (app.isProduction) {
    // JWT_SECRET is already required above
    // Add other production validation here as needed
  }

  if (errors.length > 0) {
    console.error('\n❌ Configuration Validation Failed:\n');
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error('');
    process.exit(1);
  }

  console.log(`✅ Configuration validated (${app.env} mode)`);
}

/**
 * Log configuration summary (for debugging, omits sensitive values)
 */
export function logConfigurationSummary(): void {
  console.log('\n📋 Configuration Summary:');
  console.log(`  Environment: ${app.env}`);
  console.log(`  Service Name: ${app.serviceName}`);
  console.log(`  Server Port: ${server.port}`);
  console.log(`  Database: ${database.filename}`);
  console.log(`  Audit: ${audit.enabled ? 'enabled' : 'disabled'}`);
  console.log(`  Logging Level: ${logging.level}`);
  console.log(`  Email: ${email.isConfigured ? 'configured' : 'not configured'}`);
  console.log('');
}

// Export TypeScript types for configuration
export type Config = typeof config;
export type AppConfig = typeof app;
export type ServerConfig = typeof server;
export type DatabaseConfig = typeof database;
export type AuditConfig = typeof audit;
export type LoggingConfig = typeof logging;
export type EmailConfig = typeof email;
export type AuthConfig = typeof auth;
export type SecurityConfig = typeof security;
