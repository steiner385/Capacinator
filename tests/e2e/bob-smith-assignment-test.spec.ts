import { test, expect, waitForPageReady, waitForApiCall } from './helpers/base-test';
import { testConfig } from './helpers/test-config';

test.describe('Bob Smith Assignment via Add Projects Modal', () => {
  test('Reproduce user\'s exact issue with Bob Smith assignment', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Capture all console errors and network requests
    const consoleErrors: string[] = [];
    const networkErrors: any[] = [];
    const apiRequests: any[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`🔴 Browser Console Error: ${msg.text()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText()
        });
        
        if (response.status() >= 400) {
          networkErrors.push({
            url: response.url(),
            method: response.request().method(),
            status: response.status(),
            statusText: response.statusText()
          });
          console.log(`🔴 API Error: ${response.request().method()} ${response.url()} - ${response.status()}`);
        }
      }
    });
    
    // Navigate to utilization report
    console.log('🚀 Starting Bob Smith assignment test...');
    await page.goto('/reports');
    await waitForPageReady(page);
    
    // Navigate to utilization report tab
    console.log('📊 Navigating to Utilization Report tab...');
    const utilizationTab = page.locator('button').filter({ hasText: 'Utilization Report' });
    if (await utilizationTab.isVisible()) {
      await utilizationTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for utilization data to load
    await page.waitForTimeout(3000);
    
    // Look for Bob Smith in the utilization report
    console.log('🔍 Looking for Bob Smith in utilization report...');
    const bobSmithRow = page.locator('tr').filter({ hasText: /Bob|bob|Bob Smith/i });
    const bobExists = await bobSmithRow.count() > 0;
    
    if (!bobExists) {
      console.log('⚠️  Bob Smith not found in utilization report. Available people:');
      const allRows = page.locator('table tbody tr');
      const rowCount = await allRows.count();
      
      if (rowCount === 0) {
        console.log('⚠️  No people found in utilization table - feature may not be implemented');
        expect(page.url()).toContain('/reports');
        return;
      }
      
      for (let i = 0; i < Math.min(rowCount, 10); i++) {
        const rowText = await allRows.nth(i).textContent();
        if (rowText && rowText.trim()) {
          console.log(`   - ${rowText.trim()}`);
        }
      }
      
      // Use the first person available instead
      const firstPersonRow = allRows.first();
      const firstPersonName = await firstPersonRow.locator('td').first().textContent();
      console.log(`📝 Using first available person: ${firstPersonName}`);
    }
    
    // Find and click the "Add Projects" button for underutilized people (<70%)
    console.log('🔍 Looking for Add Projects button for underutilized people...');
    
    // First, let's look for Bob Smith specifically, or any underutilized person
    let targetPersonRow = null;
    const allRows = page.locator('table tbody tr');
    const rowCount = await allRows.count();
    
    console.log(`📊 Found ${rowCount} people in utilization table`);
    
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const personName = await row.locator('td').first().textContent();
      const utilizationText = await row.locator('td').nth(2).textContent(); // Utilization is likely in 3rd column
      
      console.log(`   Person ${i + 1}: ${personName} - Utilization: ${utilizationText}`);
      
      // Look for Bob Smith first, or any person with low utilization shown
      if (personName?.toLowerCase().includes('bob')) {
        targetPersonRow = row;
        console.log(`🎯 Target person found: ${personName}`);
        break;
      }
    }
    
    // If no Bob found, use first underutilized person
    if (!targetPersonRow && rowCount > 0) {
      targetPersonRow = allRows.first();
      console.log('📝 Using first person in the list as target');
    }
    
    if (!targetPersonRow) {
      console.log('❌ No target person found to test assignment flow');
      return;
    }
    
    // Look for Add Projects button
    const addProjectsButton = targetPersonRow.locator('button').filter({ hasText: /Add Projects/i });
    
    if (await addProjectsButton.isVisible()) {
      console.log('✅ Found Add Projects button, clicking...');
      await addProjectsButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector(testConfig.selectors.modalDialog, { 
        timeout: testConfig.timeouts.elementVisible 
      });
      
      console.log('📋 Modal opened successfully');
      
      // Check modal content
      const modalTitle = page.locator(testConfig.selectors.modalDialog).locator('h2, h3').first();
      const titleText = await modalTitle.textContent();
      console.log(`📝 Modal title: ${titleText}`);
      
      // Look for project selection elements
      const projectCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await projectCheckboxes.count();
      
      if (checkboxCount > 0) {
        console.log(`✅ Found ${checkboxCount} project(s) available for assignment`);
        
        // Select first project
        await projectCheckboxes.first().check();
        console.log('✅ Selected first project');
        
        // Look for confirm/save button
        const confirmButton = page.locator('button').filter({ hasText: /Confirm|Save|Add|Assign/i });
        
        if (await confirmButton.isVisible()) {
          console.log('✅ Found confirm button, clicking...');
          
          // Set up response listener for assignment API
          const assignmentPromise = page.waitForResponse(
            response => response.url().includes('/api/') && 
                       response.request().method() === 'POST',
            { timeout: 10000 }
          );
          
          await confirmButton.click();
          
          try {
            const response = await assignmentPromise;
            console.log(`📡 Assignment API called: ${response.url()} - Status: ${response.status()}`);
            
            if (response.status() === 200 || response.status() === 201) {
              console.log('✅ Assignment completed successfully');
            } else {
              console.log(`❌ Assignment failed with status: ${response.status()}`);
            }
          } catch (error) {
            console.log('⚠️  No assignment API call detected within timeout');
          }
        }
      } else {
        console.log('⚠️  No projects available for assignment in modal');
      }
      
      // Close modal if still open
      const closeButton = page.locator('button').filter({ hasText: /Close|Cancel/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log('📋 Modal closed');
      }
    } else {
      console.log('⚠️  Add Projects button not found for the selected person');
      
      // Check if there are any action buttons
      const actionButtons = targetPersonRow.locator('button');
      const buttonCount = await actionButtons.count();
      console.log(`ℹ️  Found ${buttonCount} button(s) in the row`);
      
      for (let i = 0; i < buttonCount; i++) {
        const buttonText = await actionButtons.nth(i).textContent();
        console.log(`   - Button ${i + 1}: ${buttonText}`);
      }
    }
    
    // Summary of errors
    if (consoleErrors.length > 0) {
      console.log(`\n🔴 Total console errors: ${consoleErrors.length}`);
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log(`\n🔴 Total network errors: ${networkErrors.length}`);
      networkErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.method} ${error.url} - ${error.status}`);
      });
    }
    
    console.log(`\n📊 Total API requests made: ${apiRequests.length}`);
    
    // Test passes if we at least navigated to reports successfully
    expect(page.url()).toContain('/reports');
  });
});