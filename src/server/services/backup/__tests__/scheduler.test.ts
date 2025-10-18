import { initializeAutomaticBackups } from '../scheduler';

describe('backup scheduler', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should initialize automatic backups', () => {
    initializeAutomaticBackups();

    expect(consoleLogSpy).toHaveBeenCalledWith('💾 Automatic backup scheduler initialized');
  });

  it('should not throw errors when called multiple times', () => {
    expect(() => {
      initializeAutomaticBackups();
      initializeAutomaticBackups();
    }).not.toThrow();
  });
});
