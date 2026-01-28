import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../helpers/config-manager';
import { InstallerRunner } from '../helpers/installer-runner';
import { SystemValidator } from '../helpers/system-validator';
import { CleanupManager } from '../helpers/cleanup-manager';

test.describe('Capacinator Installer - App Launch and Health', () => {
  const installDir = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Capacinator');
  const exePath = path.join(installDir, 'Capacinator.exe');
  const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'capacinator');

  let configManager: ConfigManager;
  let installerRunner: InstallerRunner;
  let systemValidator: SystemValidator;
  let cleanupManager: CleanupManager;

  test.beforeAll(async () => {
    configManager = new ConfigManager();
    installerRunner = new InstallerRunner();
    systemValidator = new SystemValidator();
    cleanupManager = new CleanupManager();
  });

  test.beforeEach(async () => {
    // Clean up any previous installation
    await cleanupManager.cleanAll(installDir);

    // Verify cleanup was successful
    const cleanupResult = await cleanupManager.verifyCleanup(installDir);
    if (!cleanupResult.success) {
      console.warn('Cleanup verification failed:', cleanupResult.remaining);
    }
  });

  test('should install and launch app successfully', async () => {
    // Run installer first
    const installerPath = path.join(process.cwd(), 'dist-electron', 'Capacinator Setup 1.0.0.exe');
    console.log('Running installer...');

    const installResult = await installerRunner.runSilentInstall(installerPath, installDir);

    // Verify installation succeeded
    expect(installResult.success, `Installer failed: ${installResult.errors.join(', ')}`).toBe(true);
    expect(installResult.exitCode).toBe(0);
    expect(installResult.duration).toBeLessThan(300000); // 5 minutes max

    console.log(`Installation completed in ${installResult.duration}ms`);

    // Create test configuration AFTER installation to skip wizard
    console.log('Creating test configuration...');
    await configManager.createTestConfig(userDataPath);

    // Validate installation
    console.log('Validating installation...');
    const validation = await systemValidator.validateInstallation(installDir);

    expect(validation.files.allPresent, `Missing files: ${validation.files.missing.join(', ')}`).toBe(true);
    expect(validation.appData.exists, 'AppData directory not created').toBe(true);
    expect(validation.appData.configPresent, 'Config file not present').toBe(true);

    console.log('Config validation passed, config file exists');

    // Launch Electron app
    console.log('Launching Electron app...');
    const electronApp = await electron.launch({
      executablePath: exePath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ELECTRON_IS_DEV: '0'
      },
      timeout: 60000 // 1 minute to launch
    });

    try {
      // Wait for first window
      const window = await electronApp.firstWindow({ timeout: 30000 });
      console.log('Main window appeared');

      // Wait for server to be healthy
      console.log('Waiting for server health...');
      let healthOk = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds

      while (!healthOk && attempts < maxAttempts) {
        try {
          const response = await window.request.get('http://localhost:3456/api/health');
          if (response.status() === 200) {
            const data = await response.json();
            if (data.status === 'ok') {
              healthOk = true;
              console.log('Server health check passed');
            }
          }
        } catch (error) {
          // Server not ready yet
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      expect(healthOk, 'Server health check failed after 30 seconds').toBe(true);

      // Check for critical errors in console
      const consoleErrors: string[] = [];
      window.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Wait a bit to collect any console errors
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify no critical errors
      const criticalPatterns = ['call stack', 'process.exit', 'Cannot find module', 'maximum call stack'];
      const hasCriticalError = consoleErrors.some(error =>
        criticalPatterns.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()))
      );

      if (hasCriticalError) {
        console.error('Critical console errors:', consoleErrors);
      }
      expect(hasCriticalError, `Critical errors in console: ${consoleErrors.join('; ')}`).toBe(false);

      // Check debug log for errors
      console.log('Checking debug log for errors...');
      const debugLogPath = configManager.getDebugLogPath(userDataPath);
      const errors = await installerRunner.detectInstallationErrors(debugLogPath);

      if (errors.length > 0) {
        console.error('Errors in debug log:', errors);
        const debugLog = await configManager.readDebugLog(userDataPath);
        console.log('Debug log contents:', debugLog);
      }

      expect(errors, `Installation errors detected: ${errors.join('; ')}`).toHaveLength(0);

      // Verify window is visible
      expect(await window.isVisible()).toBe(true);

      console.log('All health checks passed!');

    } finally {
      // Close the app
      await electronApp.close();

      // Wait for process to die
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  test('installed app can perform basic operations', async () => {
    // Run installer
    const installerPath = path.join(process.cwd(), 'dist-electron', 'Capacinator Setup 1.0.0.exe');
    await installerRunner.runSilentInstall(installerPath, installDir);

    // Create test configuration AFTER installation to skip wizard
    await configManager.createTestConfig(userDataPath);

    // Launch app
    const electronApp = await electron.launch({
      executablePath: exePath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ELECTRON_IS_DEV: '0'
      },
      timeout: 60000
    });

    try {
      const window = await electronApp.firstWindow({ timeout: 30000 });

      // Wait for server health
      let healthOk = false;
      let attempts = 0;

      while (!healthOk && attempts < 30) {
        try {
          const response = await window.request.get('http://localhost:3456/api/health');
          if (response.status() === 200) {
            healthOk = true;
          }
        } catch {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      expect(healthOk).toBe(true);

      // Test basic API connectivity
      const projectsResponse = await window.request.get('http://localhost:3456/api/projects');
      expect(projectsResponse.ok(), 'Projects API failed').toBe(true);

      const rolesResponse = await window.request.get('http://localhost:3456/api/roles');
      expect(rolesResponse.ok(), 'Roles API failed').toBe(true);

      const peopleResponse = await window.request.get('http://localhost:3456/api/people');
      expect(peopleResponse.ok(), 'People API failed').toBe(true);

      console.log('Basic API operations successful');

    } finally {
      await electronApp.close();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  test.afterAll(async () => {
    // Final cleanup
    await cleanupManager.cleanAll(installDir);
  });
});
