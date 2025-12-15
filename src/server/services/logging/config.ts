import { LogLevel, LoggerConfig, Logger } from './Logger.js';
import { env } from '../../config/index.js';

export function getLoggerConfig(): LoggerConfig {
  const { server, logging } = env;

  // Parse log level
  let level: LogLevel;
  switch (logging.level) {
    case 'error':
      level = LogLevel.ERROR;
      break;
    case 'warn':
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

  // In test mode, reduce logging unless explicitly enabled
  if (server.isTest && !logging.enableTestLogs) {
    level = LogLevel.ERROR;
  }

  const config: LoggerConfig = {
    level,
    service: logging.serviceName,
    enableConsole: !server.isTest || logging.enableTestLogs,
    enableFile: server.isProduction,
    logDirectory: logging.directory,
    maxFileSize: logging.maxFileSize,
    maxFiles: logging.maxFiles,
    enableStructuredLogs: logging.enableStructuredLogs,
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
