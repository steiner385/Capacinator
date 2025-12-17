import { LogLevel, LoggerConfig, Logger } from './Logger.js';
import { config } from '../../config/environment.js';

export function getLoggerConfig(): LoggerConfig {
  const logLevelStr = config.logging.level.toLowerCase() || 'info';
  const isProduction = config.app.isProduction;
  const isTest = config.app.isTest;

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

  const loggerConfig: LoggerConfig = {
    level,
    service: config.app.serviceName,
    enableConsole: !isTest || config.logging.enableTestLogs,
    enableFile: isProduction,
    logDirectory: config.logging.directory,
    maxFileSize: parseInt(config.logging.maxFileSize, 10), // Already parsed by config
    maxFiles: parseInt(config.logging.maxFiles, 10), // Already parsed by config
    enableStructuredLogs: config.logging.format === 'json' || isProduction,
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
  if (loggerConfig.maxFileSize < 1024) {
    throw new Error('LOG_MAX_FILE_SIZE must be at least 1024 bytes');
  }

  if (loggerConfig.maxFiles < 1) {
    throw new Error('LOG_MAX_FILES must be at least 1');
  }

  return loggerConfig;
}

export function createLogger() {
  const config = getLoggerConfig();
  return Logger.getInstance(config);
}

// Export singleton instance
export const logger = createLogger();