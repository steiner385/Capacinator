/**
 * Git Sync Logger
 * Feature: 001-git-sync-integration
 * Task: T099
 *
 * Structured logging for Git operations with timing and metadata
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface GitLogEntry {
  timestamp: string;
  level: string;
  operation: string;
  message: string;
  duration?: number;
  userId?: string;
  repositoryUrl?: string;
  branch?: string;
  filesChanged?: number;
  conflictsCount?: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export class GitLogger {
  private level: LogLevel;
  private enableConsole: boolean;

  constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = (LogLevel as any)[envLevel] ?? LogLevel.INFO;
    this.enableConsole = true; // Always enable console for server logs
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  /**
   * Format log entry with structured data
   */
  private formatLogEntry(level: LogLevel, operation: string, message: string, metadata: Record<string, any> = {}): GitLogEntry {
    const entry: GitLogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      operation,
      message,
      ...metadata,
    };

    return entry;
  }

  /**
   * Write log entry to console with formatting
   */
  private writeLog(entry: GitLogEntry): void {
    if (!this.enableConsole) return;

    const emoji = this.getLevelEmoji(LogLevel[entry.level as keyof typeof LogLevel]);
    const timestamp = entry.timestamp.split('T')[1]?.split('.')[0] || '';
    const duration = entry.duration ? ` (${entry.duration}ms)` : '';
    const branch = entry.branch ? ` [${entry.branch}]` : '';

    const logLine = `${emoji} ${timestamp} [Git:${entry.operation}]${branch} ${entry.message}${duration}`;

    switch (LogLevel[entry.level as keyof typeof LogLevel]) {
      case LogLevel.ERROR:
        console.error(logLine);
        if (entry.error) {
          console.error('  Error details:', entry.error);
        }
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
          console.error('  Metadata:', entry.metadata);
        }
        break;

      case LogLevel.WARN:
        console.warn(logLine);
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
          console.warn('  Metadata:', entry.metadata);
        }
        break;

      case LogLevel.INFO:
        console.log(logLine);
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
          console.log('  Metadata:', entry.metadata);
        }
        break;

      case LogLevel.DEBUG:
        console.debug(logLine);
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
          console.debug('  Metadata:', entry.metadata);
        }
        break;
    }
  }

  /**
   * Get emoji for log level
   */
  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.INFO:
        return '📦';
      case LogLevel.DEBUG:
        return '🔍';
      default:
        return '📝';
    }
  }

  /**
   * Log error
   */
  error(operation: string, message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.formatLogEntry(LogLevel.ERROR, operation, message, metadata);

    // Extract error information if present
    if (metadata.error) {
      const error = metadata.error;
      entry.error = {
        message: error.message || String(error),
        code: error.code,
        stack: error.stack,
      };
    }

    this.writeLog(entry);
  }

  /**
   * Log warning
   */
  warn(operation: string, message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLogEntry(LogLevel.WARN, operation, message, metadata);
    this.writeLog(entry);
  }

  /**
   * Log info
   */
  info(operation: string, message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLogEntry(LogLevel.INFO, operation, message, metadata);
    this.writeLog(entry);
  }

  /**
   * Log debug
   */
  debug(operation: string, message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatLogEntry(LogLevel.DEBUG, operation, message, metadata);
    this.writeLog(entry);
  }

  /**
   * Log successful Git operation with timing
   */
  logOperationSuccess(operation: string, duration: number, metadata: Record<string, any> = {}): void {
    this.info(operation, `✓ Completed successfully`, {
      duration,
      ...metadata,
    });
  }

  /**
   * Log failed Git operation
   */
  logOperationFailure(operation: string, error: Error, metadata: Record<string, any> = {}): void {
    this.error(operation, `✗ Operation failed`, {
      error,
      ...metadata,
    });
  }

  /**
   * Log Git operation start
   */
  logOperationStart(operation: string, metadata: Record<string, any> = {}): void {
    this.debug(operation, `→ Starting operation`, metadata);
  }

  /**
   * Create a timer to track operation duration
   */
  startTimer(): () => number {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }

  /**
   * Create a child logger with additional context
   */
  child(defaultMetadata: Record<string, any>): ChildGitLogger {
    return new ChildGitLogger(this, defaultMetadata);
  }
}

/**
 * Child logger with inherited context
 */
export class ChildGitLogger {
  constructor(private parent: GitLogger, private defaultMetadata: Record<string, any>) {}

  private mergeMetadata(metadata: Record<string, any> = {}): Record<string, any> {
    return { ...this.defaultMetadata, ...metadata };
  }

  error(operation: string, message: string, metadata: Record<string, any> = {}): void {
    this.parent.error(operation, message, this.mergeMetadata(metadata));
  }

  warn(operation: string, message: string, metadata: Record<string, any> = {}): void {
    this.parent.warn(operation, message, this.mergeMetadata(metadata));
  }

  info(operation: string, message: string, metadata: Record<string, any> = {}): void {
    this.parent.info(operation, message, this.mergeMetadata(metadata));
  }

  debug(operation: string, message: string, metadata: Record<string, any> = {}): void {
    this.parent.debug(operation, message, this.mergeMetadata(metadata));
  }

  logOperationSuccess(operation: string, duration: number, metadata: Record<string, any> = {}): void {
    this.parent.logOperationSuccess(operation, duration, this.mergeMetadata(metadata));
  }

  logOperationFailure(operation: string, error: Error, metadata: Record<string, any> = {}): void {
    this.parent.logOperationFailure(operation, error, this.mergeMetadata(metadata));
  }

  logOperationStart(operation: string, metadata: Record<string, any> = {}): void {
    this.parent.logOperationStart(operation, this.mergeMetadata(metadata));
  }

  startTimer(): () => number {
    return this.parent.startTimer();
  }

  child(metadata: Record<string, any>): ChildGitLogger {
    return new ChildGitLogger(this.parent, this.mergeMetadata(metadata));
  }
}

// Export singleton instance
export const gitLogger = new GitLogger();
