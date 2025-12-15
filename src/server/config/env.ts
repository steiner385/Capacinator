/**
 * Centralized Environment Configuration
 *
 * This module provides a single source of truth for all environment variables.
 * It validates required variables at startup and provides TypeScript types for all config.
 *
 * Usage:
 *   import { env } from '../config/env';
 *   console.log(env.server.port);
 *   console.log(env.database.filename);
 */

// =============================================================================
// Type Definitions
// =============================================================================

export type Environment = 'development' | 'test' | 'e2e' | 'production';

export interface ServerConfig {
  /** Current environment */
  nodeEnv: Environment;
  /** Server port */
  port: number;
  /** Whether running in development mode */
  isDevelopment: boolean;
  /** Whether running in production mode */
  isProduction: boolean;
  /** Whether running in test mode */
  isTest: boolean;
  /** Whether running in E2E test mode */
  isE2E: boolean;
}

export interface DatabaseConfig {
  /** SQLite database filename */
  filename: string;
  /** Full database URL (if provided) */
  databaseUrl: string | null;
  /** Enable automatic backups */
  backupEnabled: boolean;
  /** Backup interval (e.g., 'daily', 'hourly') */
  backupInterval: string;
  /** Days to retain backups */
  backupRetentionDays: number;
}

export interface AuthConfig {
  /** JWT signing secret */
  jwtSecret: string;
  /** JWT token expiration time */
  jwtExpiresIn: string;
  /** Refresh token expiration time */
  jwtRefreshExpiresIn: string;
  /** Bcrypt hashing rounds */
  bcryptRounds: number;
}

export interface FileUploadConfig {
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Upload directory */
  uploadDir: string;
}

export interface SmtpConfig {
  /** SMTP server host */
  host: string;
  /** SMTP server port */
  port: number;
  /** Use secure connection */
  secure: boolean;
  /** SMTP username */
  user: string;
  /** SMTP password */
  pass: string;
  /** From email address */
  from: string;
}

export interface EmailConfig {
  /** SMTP configuration */
  smtp: SmtpConfig;
  /** Application URL for links in emails */
  appUrl: string;
}

export interface LoggingConfig {
  /** Log level */
  level: 'error' | 'warn' | 'info' | 'http' | 'debug';
  /** Log format */
  format: 'human' | 'json';
  /** Directory for log files */
  directory: string;
  /** Max log file size in bytes */
  maxFileSize: number;
  /** Max number of log files to retain */
  maxFiles: number;
  /** Service name for logs */
  serviceName: string;
  /** Enable console logging in tests */
  enableTestLogs: boolean;
  /** Enable structured JSON logs */
  enableStructuredLogs: boolean;
}

export interface ClientLoggingConfig {
  /** Enable remote client logging */
  enabled: boolean;
  /** Endpoint for client logs */
  endpoint: string;
}

export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** Max audit history entries per record */
  maxHistoryEntries: number;
  /** Days to retain audit logs */
  retentionDays: number;
  /** Fields to redact in audit logs */
  sensitiveFields: string[];
  /** Tables to audit */
  enabledTables: string[];
}

export interface AppConfig {
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
  /** Enable auto-updates */
  enableAutoUpdate: boolean;
}

export interface FeatureFlags {
  /** Debug mock database queries */
  debugMock: boolean;
}

export interface EnvConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  fileUpload: FileUploadConfig;
  email: EmailConfig;
  logging: LoggingConfig;
  clientLogging: ClientLoggingConfig;
  audit: AuditConfig;
  app: AppConfig;
  features: FeatureFlags;
}

// =============================================================================
// Validation Helpers
// =============================================================================

class ConfigValidationError extends Error {
  constructor(
    public readonly errors: string[]
  ) {
    super(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseString(value: string | undefined, defaultValue: string): string {
  return value !== undefined && value !== '' ? value : defaultValue;
}

function parseStringOrNull(value: string | undefined): string | null {
  return value !== undefined && value !== '' ? value : null;
}

function parseLogLevel(value: string | undefined): LoggingConfig['level'] {
  const level = value?.toLowerCase();
  if (level === 'error' || level === 'warn' || level === 'info' || level === 'http' || level === 'debug') {
    return level;
  }
  return 'info';
}

function parseLogFormat(value: string | undefined, isProduction: boolean): LoggingConfig['format'] {
  if (value === 'json' || value === 'human') {
    return value;
  }
  return isProduction ? 'json' : 'human';
}

function parseStringArray(value: string | undefined, defaultValue: string[]): string[] {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  return value.split(',').map(s => s.trim()).filter(s => s !== '');
}

function parseEnvironment(value: string | undefined): Environment {
  if (value === 'development' || value === 'test' || value === 'e2e' || value === 'production') {
    return value;
  }
  return 'development';
}

// =============================================================================
// Configuration Builder
// =============================================================================

function buildConfig(): EnvConfig {
  const nodeEnv = parseEnvironment(process.env.NODE_ENV);
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const isE2E = nodeEnv === 'e2e';

  return {
    server: {
      nodeEnv,
      port: parseInt(process.env.PORT, 3110),
      isDevelopment,
      isProduction,
      isTest,
      isE2E,
    },

    database: {
      filename: parseString(process.env.DB_FILENAME, isE2E ? 'capacinator-e2e.db' : 'capacinator.db'),
      databaseUrl: parseStringOrNull(process.env.DATABASE_URL),
      backupEnabled: parseBoolean(process.env.DB_BACKUP_ENABLED, true),
      backupInterval: parseString(process.env.DB_BACKUP_INTERVAL, 'daily'),
      backupRetentionDays: parseInt(process.env.DB_BACKUP_RETENTION_DAYS, 30),
    },

    auth: {
      jwtSecret: parseString(process.env.JWT_SECRET, 'dev-jwt-secret'),
      jwtExpiresIn: parseString(process.env.JWT_EXPIRES_IN, '15m'),
      jwtRefreshExpiresIn: parseString(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10),
    },

    fileUpload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 52428800), // 50MB
      uploadDir: parseString(process.env.UPLOAD_DIR, 'uploads'),
    },

    email: {
      smtp: {
        host: parseString(process.env.SMTP_HOST, 'localhost'),
        port: parseInt(process.env.SMTP_PORT, 587),
        secure: parseBoolean(process.env.SMTP_SECURE, false),
        user: parseString(process.env.SMTP_USER, ''),
        pass: parseString(process.env.SMTP_PASS, ''),
        from: parseString(process.env.SMTP_FROM, 'noreply@capacinator.com'),
      },
      appUrl: parseString(process.env.APP_URL, 'http://localhost:3120'),
    },

    logging: {
      level: parseLogLevel(process.env.LOG_LEVEL),
      format: parseLogFormat(process.env.LOG_FORMAT, isProduction),
      directory: parseString(process.env.LOG_DIRECTORY, '/tmp/capacinator-logs'),
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE, 10485760), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES, 10),
      serviceName: parseString(process.env.SERVICE_NAME, 'capacinator'),
      enableTestLogs: parseBoolean(process.env.ENABLE_TEST_LOGS, false),
      enableStructuredLogs: process.env.LOG_FORMAT === 'json' || isProduction,
    },

    clientLogging: {
      enabled: parseBoolean(process.env.ENABLE_CLIENT_REMOTE_LOGGING, true),
      endpoint: parseString(process.env.CLIENT_LOG_ENDPOINT, '/api/client-logs'),
    },

    audit: {
      enabled: parseBoolean(process.env.AUDIT_ENABLED, false) || isE2E,
      maxHistoryEntries: parseInt(process.env.AUDIT_MAX_HISTORY_ENTRIES, 1000),
      retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS, 365),
      sensitiveFields: parseStringArray(process.env.AUDIT_SENSITIVE_FIELDS, ['password', 'token', 'secret', 'key', 'hash']),
      enabledTables: parseStringArray(process.env.AUDIT_ENABLED_TABLES, ['people', 'projects', 'roles', 'assignments', 'availability']),
    },

    app: {
      autoSaveInterval: parseInt(process.env.AUTO_SAVE_INTERVAL, 30000), // 30 seconds
      enableAutoUpdate: parseBoolean(process.env.ENABLE_AUTO_UPDATE, true),
    },

    features: {
      debugMock: parseBoolean(process.env.DEBUG_MOCK, false),
    },
  };
}

// =============================================================================
// Validation
// =============================================================================

function validateConfig(config: EnvConfig): void {
  const errors: string[] = [];

  // Validate auth config in production
  if (config.server.isProduction) {
    if (config.auth.jwtSecret === 'dev-jwt-secret') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
    if (config.auth.jwtSecret.length < 32) {
      errors.push('JWT_SECRET should be at least 32 characters in production');
    }
  }

  // Validate port
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push(`PORT must be between 1 and 65535, got: ${config.server.port}`);
  }

  // Validate file upload
  if (config.fileUpload.maxFileSize < 1) {
    errors.push('MAX_FILE_SIZE must be at least 1 byte');
  }

  // Validate audit config
  if (config.audit.maxHistoryEntries < 1) {
    errors.push('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
  }
  if (config.audit.retentionDays < 1) {
    errors.push('AUDIT_RETENTION_DAYS must be at least 1');
  }

  // Validate logging
  if (config.logging.maxFileSize < 1) {
    errors.push('LOG_MAX_FILE_SIZE must be at least 1 byte');
  }
  if (config.logging.maxFiles < 1) {
    errors.push('LOG_MAX_FILES must be at least 1');
  }

  // Validate bcrypt rounds
  if (config.auth.bcryptRounds < 4 || config.auth.bcryptRounds > 31) {
    errors.push('BCRYPT_ROUNDS must be between 4 and 31');
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

let _env: EnvConfig | null = null;

/**
 * Get the environment configuration.
 * Configuration is built and validated on first access.
 */
export function getEnv(): EnvConfig {
  if (_env === null) {
    _env = buildConfig();
    validateConfig(_env);
  }
  return _env;
}

/**
 * Reset the configuration (useful for testing).
 * Forces re-reading of environment variables on next access.
 */
export function resetEnv(): void {
  _env = null;
}

/**
 * The main configuration export.
 * Provides typed access to all environment variables.
 */
export const env = new Proxy({} as EnvConfig, {
  get(_target, prop) {
    return getEnv()[prop as keyof EnvConfig];
  },
});

// =============================================================================
// Backward Compatibility Exports
// =============================================================================

/**
 * Check if audit is enabled.
 * @deprecated Use env.audit.enabled instead
 */
export function isAuditEnabled(): boolean {
  return getEnv().audit.enabled;
}

/**
 * Check if a table is audited.
 * @deprecated Use env.audit.enabledTables.includes(tableName) instead
 */
export function isTableAudited(tableName: string): boolean {
  const config = getEnv();
  return config.audit.enabled && config.audit.enabledTables.includes(tableName);
}
