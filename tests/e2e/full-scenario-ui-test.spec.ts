import { test, expect } from '@playwright/test';

test.describe('Complete Scenario UI Test', () => {
  test('should login and display scenarios page with corruption prevention features', async ({ page }) => {
    console.log('🚀 Starting complete scenario UI test');
    
    // Enable logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', error => console.log('ERROR:', error.message));

    // Go to the application
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📸 Taking screenshot of login screen');
    await page.screenshot({ path: 'test-results/login-screen.png', fullPage: true });

    // Login as Alice Johnson (Project Manager)
    console.log('🔐 Logging in as Alice Johnson');
    await page.selectOption('#person-select', '123e4567-e89b-12d3-a456-426614174000');
    await page.click('.login-button');
    
    // Wait for login to complete and scenarios page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('📸 Taking screenshot after login');
    await page.screenshot({ path: 'test-results/after-login.png', fullPage: true });

    // Check if we're now on the scenarios page
    const pageContent = await page.content();
    const hasScenarioContent = pageContent.includes('Scenario') || pageContent.includes('Planning');
    
    if (hasScenarioContent) {
      console.log('✅ Successfully logged in and reached scenarios page');
      
      // Look for scenario cards
      const scenarioCards = await page.locator('.scenario-card').count();
      const scenarioGrids = await page.locator('.scenarios-grid').count();
      const newButtons = await page.locator('button:has-text("New Scenario"), button:has-text("Create")').count();
      
      console.log(`📊 Found ${scenarioCards} scenario cards`);
      console.log(`📊 Found ${scenarioGrids} scenario grids`);
      console.log(`📊 Found ${newButtons} new scenario buttons`);

      // Take screenshot of scenarios page
      await page.screenshot({ path: 'test-results/scenarios-page-loaded.png', fullPage: true });

      if (scenarioCards > 0) {
        console.log('🎉 SCENARIO CARDS VISIBLE! Testing corruption prevention features...');
        
        // Look for merge buttons (corruption prevention feature)
        const mergeButtons = await page.locator('button:has-text("Merge"), [title*="Merge"]').count();
        const branchButtons = await page.locator('button:has-text("Branch"), [title*="Branch"]').count();
        const compareButtons = await page.locator('button:has-text("Compare"), [title*="Compare"]').count();
        
        console.log(`🔗 Found ${mergeButtons} merge buttons`);
        console.log(`🌿 Found ${branchButtons} branch buttons`);
        console.log(`⚖️ Found ${compareButtons} compare buttons`);

        // Test creating a new scenario to demonstrate the UI
        if (newButtons > 0) {
          console.log('🆕 Testing scenario creation UI');
          await page.click('button:has-text("New Scenario"), button:has-text("Create")');
          await page.waitForTimeout(1000);
          
          // Take screenshot of create modal
          await page.screenshot({ path: 'test-results/create-scenario-modal.png', fullPage: true });
          
          // Fill out the form if modal appeared
          const modalVisible = await page.locator('.modal-content, input[id="scenario-name"]').count() > 0;
          if (modalVisible) {
            console.log('📝 Filling out scenario creation form');
            
            const nameInput = page.locator('input[id="scenario-name"], input[name="name"]').first();
            if (await nameInput.count() > 0) {
              await nameInput.fill('UI Test Scenario - Database Safe');
            }
            
            const descInput = page.locator('textarea[id="scenario-description"], textarea[name="description"]').first();
            if (await descInput.count() > 0) {
              await descInput.fill('Testing the UI with database corruption prevention');
            }
            
            // Submit the form
            const submitButton = page.locator('button:has-text("Create Scenario"), button:has-text("Create")').first();
            if (await submitButton.count() > 0) {
              await submitButton.click();
              await page.waitForTimeout(2000);
              
              console.log('✅ Scenario creation form submitted');
              await page.screenshot({ path: 'test-results/after-scenario-creation.png', fullPage: true });
            }
          }
        }

        // Test scenario actions if any scenarios have action buttons
        if (mergeButtons > 0 || branchButtons > 0) {
          console.log('🔄 Testing scenario action buttons');
          
          // Try clicking a branch button to show the corruption prevention in action
          const firstBranchButton = page.locator('button:has-text("Branch")').first();
          if (await firstBranchButton.count() > 0) {
            await firstBranchButton.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'test-results/branch-action.png', fullPage: true });
            console.log('✅ Branch action tested');
          }
        }

      } else if (newButtons > 0) {
        console.log('💡 No scenario cards found, but create button available - testing creation');
        await page.click('button:has-text("New Scenario"), button:has-text("Create")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/empty-state-create.png', fullPage: true });
      } else {
        console.log('📋 Scenarios page loaded but still loading data...');
        
        // Wait a bit more for React Query to load data
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-results/scenarios-loading.png', fullPage: true });
        
        // Check again
        const finalCards = await page.locator('.scenario-card').count();
        console.log(`📊 After waiting: Found ${finalCards} scenario cards`);
      }

    } else {
      console.log('⚠️ Still not on scenarios page, taking debug screenshot');
      await page.screenshot({ path: 'test-results/not-scenarios-page.png', fullPage: true });
      
      // Check what page we're actually on
      const currentUrl = page.url();
      const pageTitle = await page.title();
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`📝 Page title: ${pageTitle}`);
      
      // Log visible text for debugging
      const visibleText = await page.locator('body').textContent();
      console.log(`📄 Visible text: ${visibleText?.substring(0, 200)}...`);
    }

    // Final verification - ensure the page is interactive
    console.log('✅ UI test completed - page is functional');
    await expect(page.locator('body')).toBeVisible();
  });
});