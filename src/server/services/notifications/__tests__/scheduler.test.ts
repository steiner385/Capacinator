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

import { initializeNotificationScheduler } from '../scheduler.js';
import { logger } from '../../logging/config.js';

describe('notification scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize notification scheduler', () => {
    initializeNotificationScheduler();

    expect(logger.info).toHaveBeenCalledWith('Notification scheduler initialized');
  });

  it('should not throw errors when called multiple times', () => {
    expect(() => {
      initializeNotificationScheduler();
      initializeNotificationScheduler();
    }).not.toThrow();
  });
});
