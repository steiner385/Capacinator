import { initializeNotificationScheduler } from '../scheduler';

describe('notification scheduler', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should initialize notification scheduler', () => {
    initializeNotificationScheduler();

    expect(consoleLogSpy).toHaveBeenCalledWith('📧 Notification scheduler initialized');
  });

  it('should not throw errors when called multiple times', () => {
    expect(() => {
      initializeNotificationScheduler();
      initializeNotificationScheduler();
    }).not.toThrow();
  });
});
