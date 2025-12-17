import type { Request } from 'express';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  DEBUG = 4
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: number;
  maxFiles: number;
  enableStructuredLogs: boolean;
  redactedFields: string[];
}

export class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        throw new Error('Logger must be initialized with config on first use');
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private redactSensitiveData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const redacted: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const field of this.config.redactedFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }

    // Deep redaction for nested objects
    for (const key in redacted) {
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }

    return redacted;
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    metadata: Record<string, unknown> = {},
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      service: this.config.service,
      ...metadata
    };

    if (error) {
      const errorWithCode = error as Error & { code?: string };
      entry.error = {
        message: error?.message || 'Unknown error',
        stack: this.config.level >= LogLevel.DEBUG ? error?.stack : undefined,
        code: errorWithCode?.code
      };
    }

    // Redact sensitive data
    if (entry.metadata) {
      entry.metadata = this.redactSensitiveData(entry.metadata) as Record<string, unknown>;
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      if (this.config.enableStructuredLogs) {
        console.log(JSON.stringify(entry));
      } else {
        const emoji = this.getLevelEmoji(LogLevel[entry.level as keyof typeof LogLevel]);
        const timestamp = entry.timestamp.split('T')[1]?.split('.')[0] || '';
        console.log(`${emoji} [${timestamp}] ${entry.message}${entry.error ? ` - ${entry.error.message}` : ''}`);
      }
    }

    // File logging would be implemented here
    // For now, we'll keep it simple with console logging
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.HTTP: return '🌐';
      case LogLevel.DEBUG: return '🔍';
      default: return '📝';
    }
  }

  error(message: string, error?: Error, metadata: Record<string, unknown> = {}): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.formatLogEntry(LogLevel.ERROR, message, metadata, error);
    this.writeLog(entry);
  }

  warn(message: string, metadata: Record<string, unknown> = {}): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLogEntry(LogLevel.WARN, message, metadata);
    this.writeLog(entry);
  }

  info(message: string, metadata: Record<string, unknown> = {}): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLogEntry(LogLevel.INFO, message, metadata);
    this.writeLog(entry);
  }

  http(message: string, metadata: Record<string, unknown> = {}): void {
    if (!this.shouldLog(LogLevel.HTTP)) return;
    const entry = this.formatLogEntry(LogLevel.HTTP, message, metadata);
    this.writeLog(entry);
  }

  debug(message: string, metadata: Record<string, unknown> = {}): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatLogEntry(LogLevel.DEBUG, message, metadata);
    this.writeLog(entry);
  }

  // Convenience method for HTTP requests
  logRequest(req: Request, statusCode: number, duration: number): void {
    const reqWithContext = req as Request & { requestId?: string; user?: { id: string } };
    this.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: reqWithContext.requestId,
      userId: reqWithContext.user?.id
    });
  }

  // Convenience method for business operations
  logBusinessOperation(
    operation: string,
    entityType: string,
    entityId: string,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.info('Business Operation', {
      operation,
      entityType,
      entityId,
      userId,
      ...metadata
    });
  }

  // Convenience method for performance monitoring
  logPerformance(
    operation: string,
    duration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    if (!this.shouldLog(level)) return;

    const entry = this.formatLogEntry(level, 'Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...metadata
    });
    this.writeLog(entry);
  }

  // Create a child logger with additional context
  child(metadata: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, metadata);
  }
}

export class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultMetadata: Record<string, unknown>
  ) {}

  private mergeMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...this.defaultMetadata, ...metadata };
  }

  error(message: string, error?: Error, metadata: Record<string, unknown> = {}): void {
    this.parent.error(message, error, this.mergeMetadata(metadata));
  }

  warn(message: string, metadata: Record<string, unknown> = {}): void {
    this.parent.warn(message, this.mergeMetadata(metadata));
  }

  info(message: string, metadata: Record<string, unknown> = {}): void {
    this.parent.info(message, this.mergeMetadata(metadata));
  }

  http(message: string, metadata: Record<string, unknown> = {}): void {
    this.parent.http(message, this.mergeMetadata(metadata));
  }

  debug(message: string, metadata: Record<string, unknown> = {}): void {
    this.parent.debug(message, this.mergeMetadata(metadata));
  }

  logRequest(req: Request, statusCode: number, duration: number): void {
    this.parent.logRequest(req, statusCode, duration);
  }

  logBusinessOperation(
    operation: string,
    entityType: string,
    entityId: string,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.parent.logBusinessOperation(operation, entityType, entityId, userId, this.mergeMetadata(metadata));
  }

  logPerformance(
    operation: string,
    duration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.parent.logPerformance(operation, duration, this.mergeMetadata(metadata));
  }

  child(metadata: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this.parent, this.mergeMetadata(metadata));
  }
}