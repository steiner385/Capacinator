#!/usr/bin/env tsx

/**
 * Clean up installer test artifacts
 *
 * This script removes all Capacinator installation artifacts including:
 * - Installation directory
 * - AppData directory
 * - Desktop and Start Menu shortcuts
 * - Running processes
 *
 * Usage: npm run test:installer:cleanup
 */

import { CleanupManager } from '../tests/installer/helpers/cleanup-manager';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== Capacinator Installer Test Cleanup ===\n');

  const installDir = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Capacinator');
  const cleanupManager = new CleanupManager();

  try {
    // Clean all artifacts
    await cleanupManager.cleanAll(installDir);

    // Verify cleanup
    const result = await cleanupManager.verifyCleanup(installDir);

    if (result.success) {
      console.log('\n✅ Cleanup successful - all artifacts removed');
      process.exit(0);
    } else {
      console.log('\n⚠️  Cleanup completed with warnings:');
      result.remaining.forEach(item => console.log(`  - ${item}`));
      process.exit(0); // Still exit successfully - warnings are OK
    }
  } catch (error) {
    console.error('\n❌ Cleanup failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

main();
