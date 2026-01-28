import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SystemValidator } from './system-validator';
import { InstallerRunner } from './installer-runner';

export class CleanupManager {
  private systemValidator = new SystemValidator();
  private installerRunner = new InstallerRunner();

  /**
   * Clean all test artifacts
   */
  async cleanAll(installDir?: string): Promise<void> {
    const defaultInstallDir = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Capacinator');
    const targetInstallDir = installDir || defaultInstallDir;

    console.log('Starting cleanup...');

    // Kill any running processes
    await this.killProcesses();

    // Run uninstaller if it exists
    await this.runUninstaller(targetInstallDir);

    // Clean installation directory
    await this.cleanInstallDirectory(targetInstallDir);

    // Clean AppData directory
    await this.cleanAppDataDirectory();

    // Clean shortcuts
    await this.cleanShortcuts();

    console.log('Cleanup complete');
  }

  /**
   * Kill all Capacinator processes
   */
  private async killProcesses(): Promise<void> {
    console.log('Killing Capacinator processes...');
    await this.systemValidator.killProcesses();
  }

  /**
   * Run the uninstaller if it exists
   */
  private async runUninstaller(installDir: string): Promise<void> {
    const uninstallerPath = path.join(installDir, 'Uninstall Capacinator.exe');

    try {
      await fs.access(uninstallerPath);
      console.log('Running uninstaller...');
      const result = await this.installerRunner.runSilentUninstall(uninstallerPath);

      if (!result.success) {
        console.warn('Uninstaller failed:', result.errors);
      }

      // Wait for uninstaller to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch {
      console.log('No uninstaller found, skipping');
    }
  }

  /**
   * Clean installation directory
   */
  private async cleanInstallDirectory(installDir: string): Promise<void> {
    try {
      await fs.access(installDir);
      console.log(`Removing installation directory: ${installDir}`);
      await fs.rm(installDir, { recursive: true, force: true });
    } catch {
      console.log('Installation directory does not exist');
    }
  }

  /**
   * Clean AppData directory
   */
  private async cleanAppDataDirectory(): Promise<void> {
    const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'capacinator');

    try {
      await fs.access(appDataPath);
      console.log(`Removing AppData directory: ${appDataPath}`);
      await fs.rm(appDataPath, { recursive: true, force: true });
    } catch {
      console.log('AppData directory does not exist');
    }
  }

  /**
   * Clean desktop and start menu shortcuts
   */
  private async cleanShortcuts(): Promise<void> {
    const shortcuts = [
      path.join(os.homedir(), 'Desktop', 'Capacinator.lnk'),
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Capacinator.lnk')
    ];

    for (const shortcut of shortcuts) {
      try {
        await fs.unlink(shortcut);
        console.log(`Removed shortcut: ${shortcut}`);
      } catch {
        // Shortcut doesn't exist, ignore
      }
    }
  }

  /**
   * Verify cleanup was successful
   */
  async verifyCleanup(installDir?: string): Promise<{
    success: boolean;
    remaining: string[];
  }> {
    const defaultInstallDir = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Capacinator');
    const targetInstallDir = installDir || defaultInstallDir;

    const remaining: string[] = [];

    // Check if process is still running
    if (await this.systemValidator.isProcessRunning()) {
      remaining.push('Capacinator process still running');
    }

    // Check if installation directory exists
    try {
      await fs.access(targetInstallDir);
      remaining.push(`Installation directory still exists: ${targetInstallDir}`);
    } catch {
      // Good - directory removed
    }

    // Check if AppData exists
    const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'capacinator');
    try {
      await fs.access(appDataPath);
      remaining.push(`AppData directory still exists: ${appDataPath}`);
    } catch {
      // Good - directory removed
    }

    // Check shortcuts
    const shortcuts = [
      path.join(os.homedir(), 'Desktop', 'Capacinator.lnk'),
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Capacinator.lnk')
    ];

    for (const shortcut of shortcuts) {
      try {
        await fs.access(shortcut);
        remaining.push(`Shortcut still exists: ${shortcut}`);
      } catch {
        // Good - shortcut removed
      }
    }

    return {
      success: remaining.length === 0,
      remaining
    };
  }
}
