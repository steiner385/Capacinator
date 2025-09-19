import { FullConfig } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { E2EProcessManager } from './process-manager';
import { cleanupE2EDatabase } from '../../../src/server/database/init-e2e.js';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E global teardown v2...');
  
  // Get process manager from global
  const processManager = (global as any).__E2E_PROCESS_MANAGER__ as E2EProcessManager | undefined;
  
  if (!processManager) {
    console.warn('⚠️ No process manager found, skipping process cleanup');
  } else {
    try {
      // Step 1: Clean up test data
      const testRunId = process.env.TEST_RUN_ID;
      if (testRunId) {
        console.log(`🗑️ Cleaning up test data for run: ${testRunId}`);
        // Add any test data cleanup here
      }
      
      // Step 2: Stop all processes gracefully
      await processManager.stopAll();
      
      // Step 3: Clean up database
      console.log('🗄️ Cleaning up E2E database...');
      await cleanupE2EDatabase();
      
      // Step 4: Clean up auth state (optional)
      if (process.env.CLEAN_AUTH_STATE === 'true') {
        console.log('🗑️ Cleaning up authentication state...');
        try {
          await fs.unlink(path.join('test-results', 'e2e-auth.json'));
        } catch {
          // File might not exist
        }
      }
      
      // Step 5: Release lock
      await processManager.releaseLock();
      
    } catch (error) {
      console.error('⚠️ Error during teardown:', error);
      // Force cleanup
      try {
        await processManager.stopAll();
        await processManager.releaseLock();
      } catch {
        // Ignore errors during force cleanup
      }
    }
  }
  
  console.log('✅ E2E global teardown completed');
}

export default globalTeardown;