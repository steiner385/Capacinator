import { LogLevel, LoggerConfig, Logger } from './Logger.js';
import { getConfig, resetConfig as resetCentralConfig } from '../../config/index.js';

/**
 * Convert string log level to enum
 */
function toLogLevel(level: string): LogLevel {
  switch (level) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'http':
      return LogLevel.HTTP;
    case 'debug':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

export function getLoggerConfig(): LoggerConfig {
  const config = getConfig();

  const loggerConfig: LoggerConfig = {
    level: toLogLevel(config.logging.level),
    service: config.logging.serviceName,
    enableConsole: !config.isTest || config.logging.enableTestLogs,
    enableFile: config.isProduction,
    logDirectory: config.logging.directory,
    maxFileSize: config.logging.maxFileSize,
    maxFiles: config.logging.maxFiles,
    enableStructuredLogs: config.logging.format === 'json',
    redactedFields: [
      // Include audit sensitive fields
      ...config.audit.sensitiveFields,
      // Additional logging-specific fields
      'authorization',
      'cookie',
      'jwt',
      'session',
      'credit_card',
      'ssn',
      'email',
      'phone'
    ]
  };

  return loggerConfig;
}

export function createLogger() {
  const config = getLoggerConfig();
  return Logger.getInstance(config);
}

/**
 * Reset both the central config and recreate the logger.
 * Only use in tests.
 */
export function resetLoggerConfig(): void {
  resetCentralConfig();
}

// Export singleton instance
export const logger = createLogger();
