import { LogLevel, LoggerConfig, Logger } from './Logger.js';

export function getLoggerConfig(): LoggerConfig {
  const logLevelStr = process.env.LOG_LEVEL?.toLowerCase() || 'info';
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // Parse log level
  let level: LogLevel;
  switch (logLevelStr) {
    case 'error':
      level = LogLevel.ERROR;
      break;
    case 'warn':
    case 'warning':
      level = LogLevel.WARN;
      break;
    case 'info':
      level = LogLevel.INFO;
      break;
    case 'http':
      level = LogLevel.HTTP;
      break;
    case 'debug':
      level = LogLevel.DEBUG;
      break;
    default:
      level = LogLevel.INFO;
  }

  // In test mode, reduce logging unless explicitly set
  if (isTest && !process.env.LOG_LEVEL) {
    level = LogLevel.ERROR;
  }

  const config: LoggerConfig = {
    level,
    service: process.env.SERVICE_NAME || 'capacinator',
    enableConsole: !isTest || process.env.ENABLE_TEST_LOGS === 'true',
    enableFile: isProduction,
    logDirectory: process.env.LOG_DIRECTORY || '/tmp/capacinator-logs',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
    enableStructuredLogs: process.env.LOG_FORMAT === 'json' || isProduction,
    redactedFields: [
      'password',
      'token',
      'secret',
      'key',
      'hash',
      'authorization',
      'cookie',
      'jwt',
      'session',
      'credit_card',
      'ssn',
      'email', // Only in debug mode
      'phone'
    ]
  };

  // Validate configuration
  if (config.maxFileSize < 1024) {
    throw new Error('LOG_MAX_FILE_SIZE must be at least 1024 bytes');
  }

  if (config.maxFiles < 1) {
    throw new Error('LOG_MAX_FILES must be at least 1');
  }

  return config;
}

export function createLogger() {
  const config = getLoggerConfig();
  return Logger.getInstance(config);
}

// Export singleton instance
export const logger = createLogger();