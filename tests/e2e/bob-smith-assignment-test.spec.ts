import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Bob Smith Assignment via Add Projects Modal', () => {
  test('Reproduce user\'s exact issue with Bob Smith assignment', async ({ page }) => {
    const testHelpers = new TestHelpers(page);
    
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
    
    // Setup and navigate to utilization report
    console.log('🚀 Starting Bob Smith assignment test...');
    await page.goto('/');
    await testHelpers.handleProfileSelection();
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    
    // Navigate to utilization report tab
    console.log('📊 Navigating to Utilization Report tab...');
    await page.click('button:has-text("Utilization Report")');
    await page.waitForSelector('h2:has-text("🎯 Team Utilization Overview")');
    await page.waitForTimeout(3000); // Let utilization data load
    
    // Look for Bob Smith in the utilization report
    console.log('🔍 Looking for Bob Smith in utilization report...');
    const bobSmithRow = page.locator('tr:has-text("Bob"), tr:has-text("bob"), tr:has-text("Bob Smith")');
    const bobExists = await bobSmithRow.count() > 0;
    
    if (!bobExists) {
      console.log('⚠️  Bob Smith not found in utilization report. Available people:');
      const allRows = page.locator('table tr');
      const rowCount = await allRows.count();
      for (let i = 0; i < Math.min(rowCount, 10); i++) {
        const rowText = await allRows.nth(i).textContent();
        if (rowText && rowText.trim()) {
          console.log(`   - ${rowText.trim()}`);
        }
      }
      
      // Use the first person available instead
      const firstPersonRow = page.locator('table tr').nth(1); // Skip header
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
      
      console.log(`   Person ${i + 1}: ${personName} - Row Content: ${utilizationText}`);
      
      // Look for Bob Smith first, or any person with low utilization shown
      if (personName?.toLowerCase().includes('bob')) {
        targetPersonRow = row;
        console.log(`🎯 Target person found: ${personName}`);
        break;
      }
    }
    
    if (!targetPersonRow) {
      console.log('⚠️  No underutilized person found, using first person with Add Projects button');
      targetPersonRow = allRows.first();
    }
    
    // Look for the Add Projects button in the target person's row
    const addButton = targetPersonRow.locator('button:has-text("➕"), button:has-text("Add Projects")');
    const hasAddButton = await addButton.count() > 0;
    
    if (hasAddButton) {
      console.log('🖱️  Clicking Add Projects button for target person...');
      await addButton.click();
    } else {
      console.log('⚠️  No Add Projects button found for target person, trying any available button');
      const anyAddButton = page.locator('button:has-text("➕"), button:has-text("Add Projects")').first();
      const anyButtonExists = await anyAddButton.count() > 0;
      
      if (anyButtonExists) {
        await anyAddButton.click();
      } else {
        throw new Error('No Add Projects button found in utilization report');
      }
    }
    
    // Wait for the Add Projects modal to open
    console.log('⏳ Waiting for Add Projects modal to open...');
    await page.waitForTimeout(2000);
    
    // The modal uses inline styles, not role="dialog"
    const addModal = page.locator('div').filter({ hasText: 'Add Projects:' }).first();
    const isModalVisible = await addModal.isVisible();
    console.log(`📋 Add Projects modal visible: ${isModalVisible}`);
    
    if (!isModalVisible) {
      // Check for any modal that opened
      const anyModal = page.locator('div[style*="position: fixed"]').first();
      const anyModalVisible = await anyModal.isVisible();
      if (anyModalVisible) {
        const modalText = await anyModal.textContent();
        console.log(`📋 Different modal opened: ${modalText?.substring(0, 100)}...`);
      }
      throw new Error('Add Projects modal did not open');
    }
    
    // Wait for projects to load in the modal
    console.log('⏳ Waiting for projects to load in modal...');
    await page.waitForTimeout(3000);
    
    // Look for assignment/assign buttons in the modal
    const assignButtons = addModal.locator('button:has-text("Assign"), button:has-text("Add Assignment"), button:has(svg):has-text("Assign")');
    const assignButtonCount = await assignButtons.count();
    console.log(`🎯 Found ${assignButtonCount} assignable projects in modal`);
    
    if (assignButtonCount === 0) {
      // Check what's actually in the modal
      const modalContent = await addModal.textContent();
      console.log(`📋 Modal content preview: ${modalContent?.substring(0, 300)}...`);
      
      // Look for any buttons in the modal
      const allModalButtons = addModal.locator('button');
      const allButtonCount = await allModalButtons.count();
      console.log(`🔘 Found ${allButtonCount} total buttons in modal`);
      
      for (let i = 0; i < Math.min(allButtonCount, 5); i++) {
        const buttonText = await allModalButtons.nth(i).textContent();
        console.log(`   Button ${i + 1}: "${buttonText}"`);
      }
      
      throw new Error('No assignable projects found in Add Projects modal');
    }
    
    // Click the first Assign button to trigger the exact user flow
    console.log('🎯 Attempting to assign first available project...');
    
    // Set up promise to catch the assignment API call
    const assignmentPromise = page.waitForResponse(
      response => response.url().includes('/api/assignments') && response.request().method() === 'POST',
      { timeout: 10000 }
    );
    
    // Handle any confirmation dialogs
    page.on('dialog', async dialog => {
      console.log(`💬 Dialog appeared: ${dialog.message()}`);
      await dialog.accept(); // Accept the assignment confirmation
    });
    
    // Click the assign button
    await assignButtons.first().click();
    
    try {
      // Wait for the API response
      const response = await assignmentPromise;
      const responseStatus = response.status();
      const responseBody = await response.text();
      
      console.log(`📡 Assignment API Response: ${responseStatus}`);
      console.log(`📄 Response Body: ${responseBody}`);
      
      if (responseStatus === 400) {
        console.log('🔴 CONFIRMED: 400 Bad Request error occurred!');
        console.log('📋 This reproduces the user\'s exact issue');
        
        // Parse the error response
        try {
          const errorData = JSON.parse(responseBody);
          console.log('📊 Error Details:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('📊 Raw Error Response:', responseBody);
        }
      } else if (responseStatus === 201) {
        console.log('✅ Assignment created successfully (unexpected!)');
      }
      
    } catch (error) {
      console.log(`⚠️  Assignment API call timed out or failed: ${error}`);
    }
    
    // Wait a bit more to capture any additional console errors
    await page.waitForTimeout(2000);
    
    // Report all captured errors
    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log(`🔴 Console Errors: ${consoleErrors.length}`);
    consoleErrors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
    
    console.log(`🌐 Network Errors: ${networkErrors.length}`);
    networkErrors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error.method} ${error.url} - ${error.status} ${error.statusText}`);
    });
    
    console.log(`📡 Total API Requests: ${apiRequests.length}`);
    apiRequests.forEach((req, i) => {
      if (req.url.includes('/assignments')) {
        console.log(`   ${i + 1}. ${req.method} ${req.url} - ${req.status}`);
      }
    });
    
    // Close the modal
    const closeButton = addModal.locator('button:has(svg), button:has-text("×"), button:has-text("Close")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      console.log('🚪 Modal closed');
    }
    
    console.log('🏁 Bob Smith assignment test completed');
    
    // The test should capture the actual errors without failing
    // We want to document what's happening, not assert success
  });
});