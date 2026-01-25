// Mock the logger
jest.mock('../../logging/config.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn()
  }
}));

import { initializeAutomaticBackups } from '../scheduler.js';
import { logger } from '../../logging/config.js';

describe('backup scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize automatic backups', () => {
    initializeAutomaticBackups();

    expect(logger.info).toHaveBeenCalledWith('Automatic backup scheduler initialized');
  });

  it('should not throw errors when called multiple times', () => {
    expect(() => {
      initializeAutomaticBackups();
      initializeAutomaticBackups();
    }).not.toThrow();
  });
});
