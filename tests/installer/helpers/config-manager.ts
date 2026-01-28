import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface TestConfig {
  isFirstRun: boolean;
  config: {
    database: {
      location: string;
      filename: string;
      autoBackup: boolean;
      backupInterval: string;
      backupRetention: number;
    };
    server: {
      port: number;
      host: string;
      requireAuth: boolean;
    };
    git: {
      enabled: boolean;
    };
    advanced: {
      logLevel: string;
      enableDevTools: boolean;
      maxConnections: number;
      enableCache: boolean;
      compressResponses: boolean;
    };
  };
}

export class ConfigManager {
  /**
   * Creates a pre-configured electron-store config to bypass the setup wizard
   */
  async createTestConfig(userDataPath?: string): Promise<string> {
    const configDir = userDataPath || path.join(os.homedir(), 'AppData', 'Roaming', 'capacinator');

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    const config: TestConfig = {
      isFirstRun: false,
      config: {
        database: {
          location: configDir,
          filename: 'capacinator-test.db',
          autoBackup: false,
          backupInterval: 'daily',
          backupRetention: 7
        },
        server: {
          port: 3456,
          host: 'localhost',
          requireAuth: false
        },
        git: {
          enabled: false
        },
        advanced: {
          logLevel: 'debug',
          enableDevTools: true,
          maxConnections: 10,
          enableCache: true,
          compressResponses: true
        }
      }
    };

    // electron-store uses a specific filename format: {name}.json
    // The setup wizard uses 'capacinator-config' as the store name
    const configPath = path.join(configDir, 'capacinator-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    console.log(`Test config created at: ${configPath}`);
    return configPath;
  }

  /**
   * Removes test configuration
   */
  async cleanTestConfig(userDataPath?: string): Promise<void> {
    const configDir = userDataPath || path.join(os.homedir(), 'AppData', 'Roaming', 'capacinator');
    const configPath = path.join(configDir, 'capacinator-config.json');

    try {
      await fs.unlink(configPath);
      console.log(`Test config removed: ${configPath}`);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get the path to the debug log file
   */
  getDebugLogPath(userDataPath?: string): string {
    const configDir = userDataPath || path.join(os.homedir(), 'AppData', 'Roaming', 'capacinator');
    return path.join(configDir, 'startup-debug.log');
  }

  /**
   * Read the debug log file
   */
  async readDebugLog(userDataPath?: string): Promise<string> {
    const logPath = this.getDebugLogPath(userDataPath);
    try {
      return await fs.readFile(logPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }
}
