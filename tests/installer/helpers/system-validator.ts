import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FileCheck {
  allPresent: boolean;
  missing: string[];
  found: string[];
}

export interface RegistryCheck {
  configured: boolean;
  keys: Record<string, string>;
  errors: string[];
}

export interface ShortcutCheck {
  created: boolean;
  shortcuts: string[];
  missing: string[];
}

export interface AppDataCheck {
  exists: boolean;
  configPresent: boolean;
  dbPresent: boolean;
}

export interface ValidationResult {
  files: FileCheck;
  registry: RegistryCheck;
  shortcuts: ShortcutCheck;
  appData: AppDataCheck;
}

export class SystemValidator {
  /**
   * Validate the complete installation
   */
  async validateInstallation(installDir: string): Promise<ValidationResult> {
    const [files, registry, shortcuts, appData] = await Promise.all([
      this.checkCriticalFiles(installDir),
      this.checkRegistryKeys(),
      this.checkShortcuts(),
      this.checkAppDataDirectory()
    ]);

    return { files, registry, shortcuts, appData };
  }

  /**
   * Check that all critical files are installed
   */
  private async checkCriticalFiles(installDir: string): Promise<FileCheck> {
    const criticalFiles = [
      'Capacinator.exe',
      'resources/app.asar',
      'resources/app.asar.unpacked/node_modules/better-sqlite3',
      'Uninstall Capacinator.exe'
    ];

    const found: string[] = [];
    const missing: string[] = [];

    for (const file of criticalFiles) {
      const filePath = path.join(installDir, file);
      try {
        await fs.access(filePath);
        found.push(file);
      } catch {
        missing.push(file);
      }
    }

    return {
      allPresent: missing.length === 0,
      missing,
      found
    };
  }

  /**
   * Check registry keys (Windows only)
   */
  private async checkRegistryKeys(): Promise<RegistryCheck> {
    try {
      // Query registry for Capacinator installation
      const { stdout } = await execAsync(
        'powershell -Command "Get-ItemProperty -Path HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName -eq \'Capacinator\' } | Select-Object DisplayName, InstallLocation, DisplayVersion | ConvertTo-Json"'
      );

      if (!stdout || stdout.trim() === '') {
        return {
          configured: false,
          keys: {},
          errors: ['No registry keys found']
        };
      }

      const regData = JSON.parse(stdout);
      const keys: Record<string, string> = {};

      if (regData.DisplayName) keys.DisplayName = regData.DisplayName;
      if (regData.InstallLocation) keys.InstallLocation = regData.InstallLocation;
      if (regData.DisplayVersion) keys.DisplayVersion = regData.DisplayVersion;

      return {
        configured: Object.keys(keys).length > 0,
        keys,
        errors: []
      };
    } catch (error) {
      return {
        configured: false,
        keys: {},
        errors: [`Registry check failed: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Check that shortcuts were created
   */
  private async checkShortcuts(): Promise<ShortcutCheck> {
    const shortcuts = [
      path.join(process.env.USERPROFILE || '', 'Desktop', 'Capacinator.lnk'),
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Capacinator.lnk')
    ];

    const created: string[] = [];
    const missing: string[] = [];

    for (const shortcut of shortcuts) {
      try {
        await fs.access(shortcut);
        created.push(shortcut);
      } catch {
        missing.push(shortcut);
      }
    }

    return {
      created: created.length > 0,
      shortcuts: created,
      missing
    };
  }

  /**
   * Check AppData directory
   */
  private async checkAppDataDirectory(): Promise<AppDataCheck> {
    const appDataPath = path.join(process.env.APPDATA || '', 'capacinator');

    try {
      await fs.access(appDataPath);

      const configPath = path.join(appDataPath, 'capacinator-config.json');
      const dbPath = path.join(appDataPath, 'capacinator-test.db');

      const [configPresent, dbPresent] = await Promise.all([
        fs.access(configPath).then(() => true).catch(() => false),
        fs.access(dbPath).then(() => true).catch(() => false)
      ]);

      return {
        exists: true,
        configPresent,
        dbPresent
      };
    } catch {
      return {
        exists: false,
        configPresent: false,
        dbPresent: false
      };
    }
  }

  /**
   * Check if Capacinator process is running
   */
  async isProcessRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Capacinator.exe" /NH');
      return stdout.includes('Capacinator.exe');
    } catch {
      return false;
    }
  }

  /**
   * Kill all Capacinator processes
   */
  async killProcesses(): Promise<void> {
    try {
      await execAsync('taskkill /F /IM Capacinator.exe /T');
      // Wait a moment for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Ignore errors - process might not be running
    }
  }
}
