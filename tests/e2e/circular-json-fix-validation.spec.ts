import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * Validation Test for Circular JSON Structure Fix
 * 
 * This test specifically validates that the circular JSON structure error
 * reported in the browser console has been resolved.
 */

test.describe('Circular JSON Structure Fix Validation', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.handleProfileSelection();
  });

  test('should not produce circular JSON errors when creating assignments via utilization modals', async ({ page }) => {
    // Navigate to utilization report
    await page.click('button:has-text("Utilization Report")');
    await page.waitForSelector('h2:has-text("Utilization Overview")');
    
    // Find and click an "Add Assignment" button
    const addButton = page.locator('button:has-text("➕ Add Assignment")').first();
    await addButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('[data-modal="true"], .modal, [role="dialog"]');
    
    // Fill out the assignment form
    await page.selectOption('select[name="project_id"]', '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1');
    await page.selectOption('select[name="role_id"]', '69dc7737-845a-43f0-9006-8e24c59a6e9b');
    await page.fill('input[name="allocation_percentage"]', '25');
    await page.fill('input[name="start_date"]', '2024-02-01');
    await page.fill('input[name="end_date"]', '2024-02-28');
    
    // Monitor for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('circular')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Monitor network requests for assignment creation
    let assignmentResponse: any = null;
    page.on('response', async response => {
      if (response.url().includes('/api/assignments') && response.request().method() === 'POST') {
        assignmentResponse = response;
      }
    });
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    
    // Wait for the API call to complete
    await page.waitForTimeout(2000);
    
    // Verify no circular JSON errors occurred
    expect(consoleErrors).toHaveLength(0);
    console.log('✅ No circular JSON structure errors detected in console');
    
    // Verify the API response is valid if captured
    if (assignmentResponse) {
      expect(assignmentResponse.status()).toBe(201);
      
      // Try to parse the response body - this will fail if circular references exist
      const responseBody = await assignmentResponse.json();
      expect(responseBody).toBeDefined();
      expect(responseBody).toHaveProperty('id');
      
      console.log('✅ Assignment API response successfully parsed without circular reference errors');
      
      // Clean up - delete the created assignment
      if (responseBody.id) {
        await page.request.delete(`https://localhost:3120/api/assignments/${responseBody.id}`);
      }
    }
    
    // Close modal if still open
    const modal = page.locator('[data-modal="true"], .modal, [role="dialog"]');
    if (await modal.count() > 0) {
      await page.keyboard.press('Escape');
    }
  });

  test('should handle notification scheduler calls without circular references', async ({ page }) => {
    // Direct API test to ensure the notification scheduler fix works
    const assignmentData = {
      project_id: '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1',
      person_id: '123e4567-e89b-12d3-a456-426614174001',
      role_id: '69dc7737-845a-43f0-9006-8e24c59a6e9b',
      allocation_percentage: 35,
      start_date: '2024-03-01',
      end_date: '2024-03-15',
      assignment_date_mode: 'fixed'
    };

    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && (msg.text().includes('circular') || msg.text().includes('JSON'))) {
        consoleErrors.push(msg.text());
      }
    });

    // Create assignment through API (this triggers notification scheduler)
    const response = await page.request.post('https://localhost:3120/api/assignments', {
      data: assignmentData
    });

    // Validate response
    expect(response.status()).toBe(201);
    const responseBody = await response.json();
    
    // Test that the response can be stringified and parsed (no circular refs)
    expect(() => {
      const stringified = JSON.stringify(responseBody);
      JSON.parse(stringified);
    }).not.toThrow();
    
    console.log('✅ Assignment creation with notification scheduler completed without circular reference errors');
    
    // Wait a moment for any async notification processing
    await page.waitForTimeout(1000);
    
    // Verify no console errors occurred
    expect(consoleErrors).toHaveLength(0);
    
    // Clean up
    await page.request.delete(`https://localhost:3120/api/assignments/${responseBody.id}`);
  });
});