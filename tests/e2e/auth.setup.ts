import { test as setup } from '@playwright/test';

/**
 * Auth setup that runs before all tests
 * This ensures we have a valid auth state for all subsequent tests
 */
setup('authenticate', async ({ page, context }) => {
  // This test runs with no existing storage state
  // It will go through the profile selection flow if needed
  
  console.log('🔐 Setting up authentication...');
  
  await page.goto('/');
  
  // Check if we need to select a profile
  const needsProfile = await page.locator('text="Select Your Profile"').isVisible({ 
    timeout: 5000 
  }).catch(() => false);
  
  if (needsProfile) {
    console.log('📋 Profile selection required');
    
    // Handle profile selection
    const selectTrigger = page.locator('#person-select');
    await selectTrigger.click();
    await page.waitForTimeout(500);
    
    // Select first available option
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    
    // Continue
    await page.locator('button:has-text("Continue")').click();
    
    // Wait for modal to close
    await page.waitForSelector('text="Select Your Profile"', {
      state: 'detached',
      timeout: 10000
    });
    
    console.log('✅ Profile selected');
  } else {
    console.log('✅ Already authenticated');
  }
  
  // Save the storage state for other tests
  await context.storageState({ path: 'test-results/e2e-auth.json' });
  console.log('💾 Auth state saved');
});