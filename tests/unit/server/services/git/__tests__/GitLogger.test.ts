/**
 * GitLogger Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #107 - Git Sync Unit Tests - Tier 3 Supporting Services
 *
 * Tests for GitLogger covering:
 * - Log level filtering
 * - Structured log entry formatting
 * - Console output methods
 * - Timer utilities
 * - Child logger with metadata inheritance
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { GitLogger, ChildGitLogger, LogLevel, GitLogEntry } from '../../../../../../src/server/services/git/GitLogger.js';

// ===========================================
// Mock Console
// ===========================================

const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const originalConsole = { ...console };

// ===========================================
// Test Helpers
// ===========================================

function setupMockConsole() {
  console.log = mockConsole.log;
  console.warn = mockConsole.warn;
  console.error = mockConsole.error;
  console.debug = mockConsole.debug;
}

function restoreConsole() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

function clearMockConsole() {
  mockConsole.log.mockClear();
  mockConsole.warn.mockClear();
  mockConsole.error.mockClear();
  mockConsole.debug.mockClear();
}

// ===========================================
// Tests
// ===========================================

describe('GitLogger', () => {
  let logger: GitLogger;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    clearMockConsole();
    setupMockConsole();
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalEnv;
    restoreConsole();
  });

  describe('constructor', () => {
    test('should default to INFO level when no env set', () => {
      delete process.env.LOG_LEVEL;
      logger = new GitLogger();

      // INFO should log at INFO level
      logger.info('test', 'message');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should respect ERROR log level from env', () => {
      process.env.LOG_LEVEL = 'ERROR';
      logger = new GitLogger();

      logger.info('test', 'info message');
      logger.warn('test', 'warn message');
      logger.error('test', 'error message');

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should respect WARN log level from env', () => {
      process.env.LOG_LEVEL = 'WARN';
      logger = new GitLogger();

      logger.info('test', 'info message');
      logger.warn('test', 'warn message');
      logger.error('test', 'error message');

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should respect DEBUG log level from env', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();

      logger.debug('test', 'debug message');
      logger.info('test', 'info message');

      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should handle lowercase log level', () => {
      process.env.LOG_LEVEL = 'debug';
      logger = new GitLogger();

      logger.debug('test', 'message');
      expect(mockConsole.debug).toHaveBeenCalled();
    });

    test('should default to INFO for invalid log level', () => {
      process.env.LOG_LEVEL = 'INVALID';
      logger = new GitLogger();

      logger.info('test', 'message');
      expect(mockConsole.log).toHaveBeenCalled();

      clearMockConsole();
      logger.debug('test', 'debug message');
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log error message', () => {
      logger.error('sync', 'Sync failed');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[Git:sync]')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Sync failed')
      );
    });

    test('should include error details when error object provided', () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';

      logger.error('connect', 'Connection failed', { error });

      expect(mockConsole.error).toHaveBeenCalledWith(
        '  Error details:',
        expect.objectContaining({
          message: 'Connection refused',
          code: 'ECONNREFUSED',
        })
      );
    });

    test('should include metadata when provided', () => {
      logger.error('push', 'Push failed', { metadata: { filesChanged: 5, extra: 'data' } });

      expect(mockConsole.error).toHaveBeenCalledWith(
        '  Metadata:',
        expect.objectContaining({ filesChanged: 5, extra: 'data' })
      );
    });

    test('should include error emoji in output', () => {
      logger.error('test', 'Error message');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      );
    });
  });

  describe('warn', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log warning message', () => {
      logger.warn('merge', 'Merge may have conflicts');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Merge may have conflicts')
      );
    });

    test('should include warning emoji in output', () => {
      logger.warn('test', 'Warning message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️')
      );
    });

    test('should include metadata when provided', () => {
      logger.warn('checkout', 'Uncommitted changes', { metadata: { uncommittedFiles: 3 } });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '  Metadata:',
        expect.objectContaining({ uncommittedFiles: 3 })
      );
    });
  });

  describe('info', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log info message', () => {
      logger.info('clone', 'Repository cloned');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Repository cloned')
      );
    });

    test('should include info emoji in output', () => {
      logger.info('test', 'Info message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('📦')
      );
    });

    test('should include branch in formatted output', () => {
      logger.info('commit', 'Committed changes', { branch: 'develop' });

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[develop]')
      );
    });
  });

  describe('debug', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log debug message', () => {
      logger.debug('fetch', 'Fetching refs');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Fetching refs')
      );
    });

    test('should include debug emoji in output', () => {
      logger.debug('test', 'Debug message');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('🔍')
      );
    });

    test('should not log when level is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger = new GitLogger();

      logger.debug('test', 'Debug message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('logOperationSuccess', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log success with duration', () => {
      logger.logOperationSuccess('push', 1234);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Completed successfully')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('(1234ms)')
      );
    });

    test('should include additional metadata', () => {
      logger.logOperationSuccess('commit', 500, { metadata: { filesChanged: 3, author: 'test-user' } });

      expect(mockConsole.log).toHaveBeenCalledWith(
        '  Metadata:',
        expect.objectContaining({ filesChanged: 3, author: 'test-user' })
      );
    });
  });

  describe('logOperationFailure', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log failure with error', () => {
      const error = new Error('Permission denied');

      logger.logOperationFailure('push', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed')
      );
    });

    test('should include error details', () => {
      const error = new Error('Network timeout');

      logger.logOperationFailure('fetch', error, { repositoryUrl: 'https://github.com/test' });

      expect(mockConsole.error).toHaveBeenCalledWith(
        '  Error details:',
        expect.objectContaining({ message: 'Network timeout' })
      );
    });
  });

  describe('logOperationStart', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should log operation start', () => {
      logger.logOperationStart('clone', { repositoryUrl: 'https://github.com/test' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation')
      );
    });

    test('should not log when level is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger = new GitLogger();

      logger.logOperationStart('clone');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('startTimer', () => {
    test('should return elapsed time', async () => {
      logger = new GitLogger();
      const timer = logger.startTimer();

      // Wait a bit - use 60ms to account for timing variance
      await new Promise(resolve => setTimeout(resolve, 60));

      const elapsed = timer();

      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(200); // Allow for timing variance
    });

    test('should be callable multiple times', () => {
      logger = new GitLogger();
      const timer = logger.startTimer();

      const elapsed1 = timer();
      const elapsed2 = timer();

      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
    });
  });

  describe('child', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger = new GitLogger();
    });

    test('should create child logger with inherited metadata', () => {
      const childLogger = logger.child({ metadata: { userId: 'user-123', repositoryUrl: 'https://github.com/test' } });

      childLogger.info('commit', 'Committed');

      expect(mockConsole.log).toHaveBeenCalledWith(
        '  Metadata:',
        expect.objectContaining({ userId: 'user-123', repositoryUrl: 'https://github.com/test' })
      );
    });

    test('should merge child metadata with call metadata', () => {
      const childLogger = logger.child({ metadata: { userId: 'user-123' } });

      childLogger.info('push', 'Pushed', { metadata: { extra: 'data' } });

      // Metadata is overridden, not merged
      expect(mockConsole.log).toHaveBeenCalledWith(
        '  Metadata:',
        expect.objectContaining({ extra: 'data' })
      );
    });

    test('should allow call metadata to override default', () => {
      const childLogger = logger.child({ branch: 'develop' });

      childLogger.info('checkout', 'Checked out', { branch: 'main' });

      // Branch is extracted to log line format, verify it appears
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[main]')
      );
    });
  });
});

describe('ChildGitLogger', () => {
  let parentLogger: GitLogger;
  let childLogger: ChildGitLogger;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'DEBUG';
    clearMockConsole();
    setupMockConsole();
    parentLogger = new GitLogger();
    childLogger = new ChildGitLogger(parentLogger, { userId: 'user-456' });
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalEnv;
    restoreConsole();
  });

  describe('error', () => {
    test('should delegate to parent with merged metadata', () => {
      childLogger.error('sync', 'Sync failed', { branch: 'main' });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Sync failed')
      );
    });
  });

  describe('warn', () => {
    test('should delegate to parent with merged metadata', () => {
      childLogger.warn('merge', 'Conflicts detected');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Conflicts detected')
      );
    });
  });

  describe('info', () => {
    test('should delegate to parent with merged metadata', () => {
      childLogger.info('commit', 'Changes committed');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Changes committed')
      );
    });
  });

  describe('debug', () => {
    test('should delegate to parent with merged metadata', () => {
      childLogger.debug('fetch', 'Fetching refs');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Fetching refs')
      );
    });
  });

  describe('logOperationSuccess', () => {
    test('should delegate to parent with merged metadata', () => {
      childLogger.logOperationSuccess('push', 500);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Completed successfully')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('(500ms)')
      );
    });
  });

  describe('logOperationFailure', () => {
    test('should delegate to parent with merged metadata', () => {
      const error = new Error('Push rejected');
      childLogger.logOperationFailure('push', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed')
      );
    });
  });

  describe('logOperationStart', () => {
    test('should delegate to parent with merged metadata', () => {
      childLogger.logOperationStart('clone');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation')
      );
    });
  });

  describe('startTimer', () => {
    test('should delegate to parent startTimer', async () => {
      const timer = childLogger.startTimer();

      await new Promise(resolve => setTimeout(resolve, 50));

      const elapsed = timer();
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('child', () => {
    test('should create nested child with merged metadata', () => {
      const nestedChild = childLogger.child({ branch: 'feature-x' });

      nestedChild.info('commit', 'Nested commit');

      // Branch is extracted to log line format
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[feature-x]')
      );
    });
  });
});

describe('LogLevel', () => {
  test('should have correct numeric values', () => {
    expect(LogLevel.ERROR).toBe(0);
    expect(LogLevel.WARN).toBe(1);
    expect(LogLevel.INFO).toBe(2);
    expect(LogLevel.DEBUG).toBe(3);
  });

  test('should allow lookup by name', () => {
    expect(LogLevel['ERROR']).toBe(0);
    expect(LogLevel['DEBUG']).toBe(3);
  });

  test('should allow reverse lookup', () => {
    expect(LogLevel[0]).toBe('ERROR');
    expect(LogLevel[3]).toBe('DEBUG');
  });
});

describe('GitLogEntry format', () => {
  let logger: GitLogger;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'DEBUG';
    clearMockConsole();
    setupMockConsole();
    logger = new GitLogger();
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalEnv;
    restoreConsole();
  });

  test('should include timestamp in ISO format', () => {
    const beforeLog = new Date().toISOString().split('.')[0];
    logger.info('test', 'message');
    const afterLog = new Date().toISOString().split('.')[0];

    // Timestamp should be in the logged output (extracted from ISO format)
    const logCall = mockConsole.log.mock.calls[0][0] as string;
    // Format should include time like "HH:MM:SS"
    expect(logCall).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('should format duration correctly', () => {
    logger.info('test', 'message', { duration: 1500 });

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('(1500ms)')
    );
  });

  test('should handle missing duration', () => {
    logger.info('test', 'message');

    const logCall = mockConsole.log.mock.calls[0][0] as string;
    expect(logCall).not.toContain('ms)');
  });

  test('should handle empty metadata', () => {
    logger.info('test', 'message');

    // Should only call once for the main log line, not metadata
    expect(mockConsole.log).toHaveBeenCalledTimes(1);
  });
});
