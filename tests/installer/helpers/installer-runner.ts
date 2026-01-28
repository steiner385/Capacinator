import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface InstallResult {
  success: boolean;
  exitCode: number | null;
  duration: number;
  output: string;
  errors: string[];
}

export class InstallerRunner {
  /**
   * Run the NSIS installer in silent mode
   */
  async runSilentInstall(
    installerPath: string,
    installDir: string
  ): Promise<InstallResult> {
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';

    return new Promise((resolve) => {
      // NSIS silent install: /S flag, /D= for custom directory
      const args = ['/S', `/D=${installDir}`];

      console.log(`Running installer: "${installerPath}" ${args.join(' ')}`);

      // On Windows, use cmd /c with quoted path to handle spaces
      const process = spawn(`"${installerPath}"`, args, {
        windowsHide: true,
        shell: true
      });

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', async (code) => {
        const duration = Date.now() - startTime;
        const errors: string[] = [];

        if (code !== 0) {
          errors.push(`Installer exited with code ${code}`);
        }

        if (errorOutput) {
          errors.push(`Error output: ${errorOutput}`);
        }

        resolve({
          success: code === 0,
          exitCode: code,
          duration,
          output: output + errorOutput,
          errors
        });
      });

      process.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          exitCode: null,
          duration,
          output: '',
          errors: [`Process error: ${error.message}`]
        });
      });
    });
  }

  /**
   * Detect installation errors by analyzing debug log
   */
  async detectInstallationErrors(debugLogPath: string): Promise<string[]> {
    try {
      const logContent = await fs.readFile(debugLogPath, 'utf-8');
      const errors: string[] = [];

      const errorPatterns = [
        { pattern: /call stack overflow/i, description: 'Call stack overflow detected' },
        { pattern: /maximum call stack size exceeded/i, description: 'Stack size exceeded' },
        { pattern: /process\.exit\(1\)/i, description: 'Server called process.exit(1)' },
        { pattern: /cannot find module/i, description: 'Module not found error' },
        { pattern: /server failed to start/i, description: 'Server startup failure' },
        { pattern: /database initialization failed/i, description: 'Database initialization failure' },
        { pattern: /error loading server module/i, description: 'Server module load error' },
        { pattern: /uncaught exception/i, description: 'Uncaught exception' },
        { pattern: /unhandled rejection/i, description: 'Unhandled promise rejection' }
      ];

      for (const { pattern, description } of errorPatterns) {
        if (pattern.test(logContent)) {
          // Extract the actual error line
          const lines = logContent.split('\n');
          const errorLine = lines.find(line => pattern.test(line));
          errors.push(`${description}: ${errorLine}`);
        }
      }

      return errors;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return ['Debug log file not found'];
      }
      throw error;
    }
  }

  /**
   * Run the uninstaller in silent mode
   */
  async runSilentUninstall(uninstallerPath: string): Promise<InstallResult> {
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';

    return new Promise((resolve) => {
      const args = ['/S']; // Silent uninstall

      console.log(`Running uninstaller: "${uninstallerPath}" ${args.join(' ')}`);

      // On Windows, use cmd /c with quoted path to handle spaces
      const process = spawn(`"${uninstallerPath}"`, args, {
        windowsHide: true,
        shell: true
      });

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        const errors: string[] = [];

        if (code !== 0) {
          errors.push(`Uninstaller exited with code ${code}`);
        }

        resolve({
          success: code === 0,
          exitCode: code,
          duration,
          output: output + errorOutput,
          errors
        });
      });

      process.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          exitCode: null,
          duration,
          output: '',
          errors: [`Process error: ${error.message}`]
        });
      });
    });
  }
}
