/**
 * Post-test cleanup hook for E2E tests
 * Ensures cleanup happens even if the process exits unexpectedly
 */

import { E2EProcessManager } from './process-manager.js';
import { portCleanup } from './port-cleanup.js';
import * as fs from 'fs/promises';
import * as path from 'path';

class CleanupHook {
  private cleanupFunctions: Array<() => Promise<void>> = [];
  private isCleaningUp = false;
  private hasRegistered = false;

  constructor() {
    this.registerExitHandlers();
  }

  /**
   * Register cleanup function to be called on exit
   */
  register(name: string, cleanupFn: () => Promise<void>): void {
    console.log(`📝 Registered cleanup: ${name}`);
    this.cleanupFunctions.push(async () => {
      try {
        console.log(`🧹 Running cleanup: ${name}`);
        await cleanupFn();
        console.log(`✅ Cleanup completed: ${name}`);
      } catch (error) {
        console.error(`❌ Cleanup failed: ${name}`, error);
      }
    });
  }

  /**
   * Register process exit handlers
   */
  private registerExitHandlers(): void {
    if (this.hasRegistered) return;
    this.hasRegistered = true;

    // Handle various exit scenarios
    const exitEvents = ['exit', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'unhandledRejection'];

    exitEvents.forEach(event => {
      process.on(event as any, async (codeOrSignal: any) => {
        if (this.isCleaningUp) return;
        
        console.log(`\n🛑 Received ${event} signal, running cleanup...`);
        
        if (event === 'uncaughtException' || event === 'unhandledRejection') {
          console.error('Error:', codeOrSignal);
        }

        await this.cleanup();
        
        // Exit after cleanup for signals that require it
        if (['SIGINT', 'SIGTERM', 'uncaughtException'].includes(event)) {
          process.exit(event === 'uncaughtException' ? 1 : 0);
        }
      });
    });
  }

  /**
   * Run all cleanup functions
   */
  async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    console.log('\n🧹 Running post-test cleanup...\n');

    // Run all registered cleanup functions in reverse order
    const functions = [...this.cleanupFunctions].reverse();
    for (const fn of functions) {
      await fn();
    }

    console.log('\n✅ Post-test cleanup completed\n');
  }

  /**
   * Register default E2E cleanup tasks
   */
  registerE2ECleanup(processManager?: E2EProcessManager): void {
    // Clean up processes
    if (processManager) {
      this.register('Stop all E2E processes', async () => {
        await processManager.stopAll();
        await processManager.releaseLock();
      });
    }

    // Clean up ports
    this.register('Clean up E2E ports', async () => {
      await portCleanup.cleanupE2EPorts();
    });

    // Clean up PID files
    this.register('Clean up PID files', async () => {
      const pidDir = path.join(process.cwd(), '.e2e-pids');
      try {
        await fs.rm(pidDir, { recursive: true, force: true });
      } catch {
        // Ignore if doesn't exist
      }
    });

    // Clean up lock file
    this.register('Clean up lock file', async () => {
      const lockFile = path.join(process.cwd(), '.e2e-lock');
      try {
        await fs.unlink(lockFile);
      } catch {
        // Ignore if doesn't exist
      }
    });

    // Clean up test artifacts
    this.register('Clean up test artifacts', async () => {
      const artifactDirs = [
        'test-results',
        'playwright-report',
        'coverage'
      ];

      for (const dir of artifactDirs) {
        const dirPath = path.join(process.cwd(), dir);
        try {
          // Only remove if it's an E2E test run artifact
          const e2eMarker = path.join(dirPath, '.e2e-run');
          const exists = await fs.access(e2eMarker).then(() => true).catch(() => false);
          if (exists) {
            await fs.rm(dirPath, { recursive: true, force: true });
          }
        } catch {
          // Ignore errors
        }
      }
    });

    // Clean up environment variables
    this.register('Clean up environment', () => {
      delete process.env.TEST_BASE_URL;
      delete process.env.TEST_RUN_ID;
      delete process.env.TEST_SETUP_COMPLETE;
      return Promise.resolve();
    });
  }
}

// Export singleton instance
export const cleanupHook = new CleanupHook();

// Convenience function to register E2E cleanup
export function registerE2ECleanup(processManager?: E2EProcessManager): void {
  cleanupHook.registerE2ECleanup(processManager);
}

// Auto-register basic cleanup on import
if (process.env.NODE_ENV === 'e2e' || process.env.NODE_ENV === 'test') {
  cleanupHook.registerE2ECleanup();
}