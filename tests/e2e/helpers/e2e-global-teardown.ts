import { cleanupE2EDatabase } from '../../../src/server/database/init-e2e';

async function globalTeardown() {
  console.log('🧹 Starting E2E global teardown...');
  
  try {
    // Cleanup E2E database
    console.log('🗑️  Cleaning up E2E database...');
    await cleanupE2EDatabase();
    
    // Cleanup auth state file
    try {
      const fs = await import('fs');
      const authStatePath = 'test-results/e2e-auth.json';
      if (fs.existsSync(authStatePath)) {
        fs.unlinkSync(authStatePath);
        console.log('🗑️  E2E authentication state file removed');
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup auth state file:', error);
    }
    
    console.log('✅ E2E global teardown complete');
    
  } catch (error) {
    console.error('❌ E2E global teardown failed:', error);
    // Don't throw error to prevent test failure
  }
}

export default globalTeardown;