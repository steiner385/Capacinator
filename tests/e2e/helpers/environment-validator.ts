/**
 * Pre-test environment validator for E2E tests
 * Ensures the test environment is clean and ready before tests run
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { portCleanup, E2E_PORTS } from './port-cleanup.js';
import { execSync } from 'child_process';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EnvironmentValidatorConfig {
  checkPorts?: boolean;
  checkProcesses?: boolean;
  checkDatabase?: boolean;
  checkEnvironment?: boolean;
  checkDiskSpace?: boolean;
  verbose?: boolean;
}

export class EnvironmentValidator {
  private config: Required<EnvironmentValidatorConfig>;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(config: EnvironmentValidatorConfig = {}) {
    this.config = {
      checkPorts: true,
      checkProcesses: true,
      checkDatabase: true,
      checkEnvironment: true,
      checkDiskSpace: true,
      verbose: process.env.DEBUG_E2E === 'true',
      ...config
    };
  }

  /**
   * Validate the entire E2E environment
   */
  async validate(): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];

    this.log('\n🔍 Starting E2E environment validation...\n');

    // Run all checks
    const checks = [
      this.config.checkPorts && this.validatePorts(),
      this.config.checkProcesses && this.validateProcesses(),
      this.config.checkDatabase && this.validateDatabase(),
      this.config.checkEnvironment && this.validateEnvironmentVariables(),
      this.config.checkDiskSpace && this.validateDiskSpace()
    ].filter(Boolean);

    await Promise.all(checks);

    // Summary
    const valid = this.errors.length === 0;
    
    if (valid) {
      this.log('✅ Environment validation passed\n');
    } else {
      this.log(`❌ Environment validation failed with ${this.errors.length} errors\n`);
    }

    if (this.warnings.length > 0) {
      this.log(`⚠️  ${this.warnings.length} warnings found\n`);
    }

    return {
      valid,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  /**
   * Validate E2E ports are available
   */
  private async validatePorts(): Promise<void> {
    this.log('🔍 Checking E2E ports...');

    const ports = [E2E_PORTS.backend, E2E_PORTS.frontend];
    const results = await portCleanup.verifyPortsAvailable(ports);

    for (const [port, available] of results.entries()) {
      if (!available) {
        this.errors.push(`Port ${port} is already in use`);
      } else {
        this.log(`  ✅ Port ${port} is available`);
      }
    }
  }

  /**
   * Validate no stale processes are running
   */
  private async validateProcesses(): Promise<void> {
    this.log('🔍 Checking for stale processes...');

    // Check for common process patterns
    const processPatterns = [
      'tsx.*src/server/index.ts',
      'vite.*client-vite.config.ts',
      'playwright.*test'
    ];

    for (const pattern of processPatterns) {
      try {
        const output = execSync(`pgrep -f "${pattern}" || true`, { 
          encoding: 'utf-8' 
        }).trim();
        
        if (output) {
          const pids = output.split('\n').filter(Boolean);
          this.warnings.push(`Found ${pids.length} processes matching pattern "${pattern}"`);
        }
      } catch {
        // pgrep not available, skip this check
      }
    }

    // Check PID files
    const pidDir = path.join(process.cwd(), '.e2e-pids');
    try {
      const files = await fs.readdir(pidDir).catch(() => []);
      if (files.length > 0) {
        this.warnings.push(`Found ${files.length} PID files in ${pidDir}`);
      } else {
        this.log('  ✅ No stale PID files found');
      }
    } catch {
      this.log('  ✅ No PID directory found');
    }
  }

  /**
   * Validate database state
   */
  private async validateDatabase(): Promise<void> {
    this.log('🔍 Checking database state...');

    // Check for E2E database file
    const e2eDbFile = path.join(process.cwd(), '.e2e-data', 'e2e.db');
    try {
      const stats = await fs.stat(e2eDbFile);
      if (stats.isFile()) {
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        this.warnings.push(`E2E database exists (${sizeMB} MB) - will be recreated`);
      }
    } catch {
      this.log('  ✅ No existing E2E database found');
    }

    // Check for lock files
    const lockFile = path.join(process.cwd(), '.e2e-lock');
    try {
      const lockData = await fs.readFile(lockFile, 'utf-8');
      const lock = JSON.parse(lockData);
      this.errors.push(`E2E lock file exists (PID: ${lock.pid}) - another test may be running`);
    } catch {
      this.log('  ✅ No E2E lock file found');
    }
  }

  /**
   * Validate required environment variables
   */
  private async validateEnvironmentVariables(): Promise<void> {
    this.log('🔍 Checking environment variables...');

    const required = ['NODE_ENV'];
    const recommended = ['DEBUG_E2E', 'BASE_URL'];

    for (const varName of required) {
      if (!process.env[varName]) {
        this.errors.push(`Required environment variable ${varName} is not set`);
      } else {
        this.log(`  ✅ ${varName} = ${process.env[varName]}`);
      }
    }

    for (const varName of recommended) {
      if (!process.env[varName]) {
        this.warnings.push(`Recommended environment variable ${varName} is not set`);
      }
    }

    // Check for conflicting NODE_ENV
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'e2e' && process.env.NODE_ENV !== 'test') {
      this.warnings.push(`NODE_ENV is set to "${process.env.NODE_ENV}" - should be "e2e" for E2E tests`);
    }
  }

  /**
   * Validate disk space
   */
  private async validateDiskSpace(): Promise<void> {
    this.log('🔍 Checking disk space...');

    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const output = execSync('df -h . | tail -1', { encoding: 'utf-8' });
        const parts = output.trim().split(/\s+/);
        const usePercent = parseInt(parts[4]);
        
        if (usePercent > 90) {
          this.errors.push(`Disk usage is at ${usePercent}% - insufficient space for tests`);
        } else if (usePercent > 80) {
          this.warnings.push(`Disk usage is at ${usePercent}% - consider freeing up space`);
        } else {
          this.log(`  ✅ Disk usage is at ${usePercent}%`);
        }
      }
    } catch {
      this.log('  ℹ️  Could not check disk space');
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
  }

  /**
   * Auto-fix common issues
   */
  async autoFix(): Promise<void> {
    this.log('\n🔧 Attempting to auto-fix issues...\n');

    // Clean up ports
    if (this.errors.some(e => e.includes('Port'))) {
      this.log('🔧 Cleaning up E2E ports...');
      const success = await portCleanup.cleanupE2EPorts();
      if (success) {
        this.log('  ✅ Ports cleaned up successfully');
      } else {
        this.log('  ❌ Failed to clean up some ports');
      }
    }

    // Clean up PID files
    const pidDir = path.join(process.cwd(), '.e2e-pids');
    try {
      await fs.rm(pidDir, { recursive: true, force: true });
      this.log('  ✅ Cleaned up PID files');
    } catch {
      // Ignore errors
    }

    // Clean up lock file
    const lockFile = path.join(process.cwd(), '.e2e-lock');
    try {
      await fs.unlink(lockFile);
      this.log('  ✅ Removed E2E lock file');
    } catch {
      // Ignore errors
    }

    // Clean up database
    const e2eDbDir = path.join(process.cwd(), '.e2e-data');
    try {
      await fs.rm(e2eDbDir, { recursive: true, force: true });
      this.log('  ✅ Cleaned up E2E database');
    } catch {
      // Ignore errors
    }

    this.log('\n✅ Auto-fix completed\n');
  }
}

// Export singleton for convenience
export const environmentValidator = new EnvironmentValidator();

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const validator = new EnvironmentValidator({ verbose: true });
    const result = await validator.validate();
    
    if (!result.valid) {
      console.error('\n❌ Validation failed:');
      result.errors.forEach(e => console.error(`  - ${e}`));
      
      console.log('\nAttempting auto-fix...');
      await validator.autoFix();
      
      // Re-validate
      const secondResult = await validator.validate();
      if (!secondResult.valid) {
        console.error('\n❌ Still have errors after auto-fix');
        process.exit(1);
      }
    }
    
    console.log('\n✅ E2E environment is ready');
  })();
}