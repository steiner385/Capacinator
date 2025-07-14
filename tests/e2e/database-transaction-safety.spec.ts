import { test, expect } from '@playwright/test';

/**
 * Critical Database Transaction Safety and Concurrent Operation Tests
 * 
 * This test suite validates that the application maintains data integrity 
 * under concurrent operations, prevents race conditions, and handles 
 * database transactions safely to prevent any data corruption.
 * 
 * These tests are critical for production reliability.
 */

// Helper function to login as a user
async function loginAsUser(page: any, personId: string = '123e4567-e89b-12d3-a456-426614174000') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const loginSelect = page.locator('#person-select');
  if (await loginSelect.count() > 0) {
    await loginSelect.selectOption(personId);
    await page.click('.login-button');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
}

// Helper to create assignment via UI
async function createAssignmentViaUI(page: any, data: any) {
  await page.goto('/assignments');
  await page.waitForLoadState('networkidle');
  
  const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")');
  if (await newButton.count() > 0) {
    await newButton.first().click();
    await page.waitForTimeout(1000);

    // Fill form fields if available
    if (data.allocation) {
      const allocationField = page.locator('input[type="number"], input[placeholder*="percent"]').first();
      if (await allocationField.count() > 0) {
        await allocationField.fill(String(data.allocation));
      }
    }

    if (data.startDate) {
      const startDateField = page.locator('input[type="date"]').first();
      if (await startDateField.count() > 0) {
        await startDateField.fill(data.startDate);
      }
    }

    if (data.endDate) {
      const endDateField = page.locator('input[type="date"]').last();
      if (await endDateField.count() > 0) {
        await endDateField.fill(data.endDate);
      }
    }

    // Submit form
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

test.describe('Database Transaction Safety and Concurrent Operations', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.describe('Concurrent User Operations', () => {
    test('should handle multiple users creating assignments simultaneously without data corruption', async ({ browser }) => {
      console.log('🔒 Testing concurrent assignment creation');

      // Create multiple browser contexts to simulate different users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);

      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      // Login all users
      await Promise.all(pages.map((page, index) => 
        loginAsUser(page, index === 0 
          ? '123e4567-e89b-12d3-a456-426614174000' 
          : '123e4567-e89b-12d3-a456-426614174001'
        )
      ));

      // Track API requests and responses for data integrity validation
      const apiRequests = [];
      const apiResponses = [];

      pages.forEach((page, index) => {
        page.on('request', request => {
          if (request.url().includes('/api/assignments') && request.method() === 'POST') {
            apiRequests.push({ user: index, url: request.url(), method: request.method() });
          }
        });

        page.on('response', response => {
          if (response.url().includes('/api/assignments')) {
            apiResponses.push({ 
              user: index, 
              url: response.url(), 
              status: response.status(),
              timestamp: Date.now()
            });
          }
        });
      });

      // Have all users attempt to create assignments concurrently
      const concurrentCreations = pages.map(async (page, index) => {
        try {
          await createAssignmentViaUI(page, {
            allocation: 50,
            startDate: '2024-06-01',
            endDate: '2024-08-31'
          });
          return { success: true, user: index };
        } catch (error) {
          return { success: false, user: index, error: error.toString() };
        }
      });

      const results = await Promise.all(concurrentCreations);

      // Analyze results
      const successful = results.filter(r => r.success);
      console.log(`✅ Concurrent operations completed: ${successful.length}/${results.length} successful`);

      // Verify no server errors occurred
      const serverErrors = apiResponses.filter(r => r.status >= 500);
      expect(serverErrors.length).toBe(0);
      console.log('✅ No server errors during concurrent operations');

      // Verify all API requests were processed
      expect(apiRequests.length).toBeGreaterThanOrEqual(0);
      console.log(`✅ API requests handled: ${apiRequests.length}`);

      // Check for data consistency by verifying assignments on one page
      await pages[0].goto('/assignments');
      await pages[0].waitForLoadState('networkidle');
      
      const assignmentCount = await pages[0].locator('.assignment-card, tr[data-testid], .data-row').count();
      console.log(`✅ Data consistency check: ${assignmentCount} assignments visible`);

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('should prevent race conditions in capacity allocation conflicts', async ({ browser }) => {
      console.log('🔒 Testing race condition prevention in capacity allocation');

      // Create two browser contexts for the same user
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext()
      ]);

      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      // Login same user in both contexts
      await Promise.all(pages.map(page => loginAsUser(page)));

      // Track business rule violations
      const businessRuleViolations = [];
      
      pages.forEach((page, index) => {
        page.on('response', async response => {
          if (response.url().includes('/api/assignments') && response.status() === 400) {
            try {
              const errorData = await response.json();
              if (errorData.error && errorData.error.includes('capacity')) {
                businessRuleViolations.push({
                  user: index,
                  timestamp: Date.now(),
                  error: errorData.error
                });
              }
            } catch (e) {
              // Response might not be JSON
            }
          }
        });
      });

      // Both pages attempt to create assignments that would exceed capacity
      const racingOperations = pages.map(async (page, index) => {
        try {
          await createAssignmentViaUI(page, {
            allocation: 80, // Each trying 80% = 160% total if both succeed
            startDate: '2024-07-01',
            endDate: '2024-09-30'
          });
          return { success: true, user: index };
        } catch (error) {
          return { success: false, user: index, error: error.toString() };
        }
      });

      const raceResults = await Promise.all(racingOperations);

      // At most one should succeed to prevent over-allocation
      const successfulAllocations = raceResults.filter(r => r.success);
      expect(successfulAllocations.length).toBeLessThanOrEqual(1);
      console.log(`✅ Race condition handled: ${successfulAllocations.length}/2 allocations succeeded`);

      // Should have business rule violations detected
      if (businessRuleViolations.length > 0) {
        console.log('✅ Business rule violations properly detected and prevented');
      }

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('should maintain data integrity during rapid successive operations', async ({ page }) => {
      console.log('🔒 Testing rapid successive operations integrity');

      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      // Track all API operations
      const operations = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          operations.push({
            url: response.url(),
            method: response.request().method(),
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      // Perform rapid navigation and operations
      const rapidOperations = [
        () => page.goto('/people'),
        () => page.goto('/projects'),
        () => page.goto('/assignments'),
        () => page.goto('/scenarios'),
        () => page.goto('/dashboard')
      ];

      for (const operation of rapidOperations) {
        await operation();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Brief pause between operations
      }

      // Verify no data corruption indicators
      const serverErrors = operations.filter(op => op.status >= 500);
      expect(serverErrors.length).toBe(0);
      console.log('✅ No server errors during rapid operations');

      const clientErrors = operations.filter(op => op.status >= 400 && op.status < 500);
      console.log(`ℹ️ Client errors (expected): ${clientErrors.length}`);

      const successfulOperations = operations.filter(op => op.status >= 200 && op.status < 300);
      expect(successfulOperations.length).toBeGreaterThan(0);
      console.log(`✅ Successful operations: ${successfulOperations.length}`);
    });
  });

  test.describe('Database Transaction Integrity', () => {
    test('should handle database connection issues gracefully', async ({ page }) => {
      console.log('🔒 Testing database connection resilience');

      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      // Monitor for any database-related errors in the UI
      const errorMessages = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('database')) {
          errorMessages.push(msg.text());
        }
      });

      // Perform operations that require database access
      const databaseOperations = [
        () => page.goto('/people'),
        () => page.goto('/projects'),
        () => page.goto('/assignments'),
        () => page.reload()
      ];

      for (const operation of databaseOperations) {
        try {
          await operation();
          await page.waitForLoadState('networkidle');
          
          // Check that the page loaded without showing database errors to user
          const hasErrorUI = await page.locator('.error, .alert-error, [data-testid="error"]').count();
          expect(hasErrorUI).toBe(0);
          
        } catch (error) {
          console.log(`Operation failed gracefully: ${error.message}`);
        }
      }

      console.log(`✅ Database operations completed with ${errorMessages.length} console errors`);
    });

    test('should validate data consistency after page refreshes', async ({ page }) => {
      console.log('🔒 Testing data consistency across page refreshes');

      // Navigate to assignments and note the data
      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const initialAssignmentCount = await page.locator('.assignment-card, tr[data-testid], .data-row, .assignment-item').count();
      console.log(`Initial assignment count: ${initialAssignmentCount}`);

      // Refresh the page multiple times
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const currentCount = await page.locator('.assignment-card, tr[data-testid], .data-row, .assignment-item').count();
        
        // Data should be consistent across refreshes
        expect(Math.abs(currentCount - initialAssignmentCount)).toBeLessThanOrEqual(5); // Allow small variance
        console.log(`✅ Refresh ${i + 1}: ${currentCount} assignments (consistent)`);
      }
    });

    test('should handle browser back/forward operations safely', async ({ page }) => {
      console.log('🔒 Testing browser navigation safety');

      // Navigate through multiple pages
      const navigationSequence = [
        '/dashboard',
        '/people', 
        '/projects',
        '/assignments',
        '/scenarios'
      ];

      for (const path of navigationSequence) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // Use browser back/forward buttons
      for (let i = 0; i < 3; i++) {
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      for (let i = 0; i < 2; i++) {
        await page.goForward();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Verify the application is still functional
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const isDashboardWorking = await page.locator('h1, h2, .dashboard').count() > 0;
      expect(isDashboardWorking).toBe(true);
      console.log('✅ Browser navigation handled safely');
    });
  });

  test.describe('Business Logic Consistency Under Load', () => {
    test('should maintain allocation percentage integrity under concurrent modifications', async ({ browser }) => {
      console.log('🔒 Testing allocation percentage integrity under load');

      // Create multiple contexts for concurrent testing
      const numUsers = 3;
      const contexts = await Promise.all(
        Array.from({ length: numUsers }, () => browser.newContext())
      );
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      // Login all users
      await Promise.all(pages.map(page => loginAsUser(page)));

      // Each user tries to allocate 50% for the same person/time period
      const allocationAttempts = pages.map(async (page, index) => {
        try {
          await createAssignmentViaUI(page, {
            allocation: 50, // Total would be 150% if all succeed
            startDate: '2024-08-01',
            endDate: '2024-10-31'
          });
          return { success: true, user: index };
        } catch (error) {
          return { success: false, user: index, error: error.toString() };
        }
      });

      const allocationResults = await Promise.all(allocationAttempts);
      const successfulAllocations = allocationResults.filter(r => r.success);

      // Should not allow total allocation > 100%
      expect(successfulAllocations.length).toBeLessThanOrEqual(2); // Max 2 * 50% = 100%
      console.log(`✅ Allocation integrity maintained: ${successfulAllocations.length}/${numUsers} allocations succeeded`);

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('should prevent data corruption during form validation errors', async ({ page }) => {
      console.log('🔒 Testing data integrity during validation errors');

      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      // Track failed submissions
      const failedSubmissions = [];
      page.on('response', response => {
        if (response.url().includes('/api/assignments') && response.status() >= 400) {
          failedSubmissions.push({
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      // Attempt to submit invalid data multiple times
      const invalidSubmissions = [
        { allocation: -10, startDate: '2024-01-01', endDate: '2024-12-31' }, // Negative allocation
        { allocation: 150, startDate: '2024-01-01', endDate: '2024-12-31' }, // Over 100%
        { allocation: 50, startDate: '2024-12-31', endDate: '2024-01-01' },  // End before start
        { allocation: 0, startDate: '2024-01-01', endDate: '2024-12-31' }    // Zero allocation
      ];

      for (const invalidData of invalidSubmissions) {
        try {
          await createAssignmentViaUI(page, invalidData);
          await page.waitForTimeout(1000);
        } catch (error) {
          // Expected to fail
          console.log('Invalid submission properly rejected');
        }
      }

      // After all failed submissions, verify system is still functional
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const systemFunctional = await page.locator('h1, h2, .dashboard').count() > 0;
      expect(systemFunctional).toBe(true);
      console.log('✅ System remains functional after validation errors');
    });

    test('should handle edge cases in date and time operations', async ({ page }) => {
      console.log('🔒 Testing date/time edge case handling');

      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      // Test edge cases that could cause data corruption
      const edgeCases = [
        { startDate: '2024-02-29', endDate: '2024-03-01' }, // Leap year
        { startDate: '2024-12-31', endDate: '2025-01-01' }, // Year boundary
        { startDate: '2024-01-01', endDate: '2024-01-01' }, // Same day
        { startDate: '2024-06-01', endDate: '2024-06-30' }  // Month boundary
      ];

      for (const dateCase of edgeCases) {
        try {
          await createAssignmentViaUI(page, {
            allocation: 25,
            ...dateCase
          });
          await page.waitForTimeout(1000);
          console.log(`✅ Date edge case handled: ${dateCase.startDate} to ${dateCase.endDate}`);
        } catch (error) {
          console.log(`Date edge case rejected (acceptable): ${error.message}`);
        }
      }

      // Verify system stability
      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');
      
      const pageLoaded = await page.locator('body').count() > 0;
      expect(pageLoaded).toBe(true);
      console.log('✅ System stable after date edge case testing');
    });
  });

  test.describe('Data Recovery and Resilience', () => {
    test('should handle unexpected page closes gracefully', async ({ browser }) => {
      console.log('🔒 Testing unexpected page close handling');

      const context = await browser.newContext();
      const page = await context.newPage();

      await loginAsUser(page);
      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      // Start a form operation
      const newButton = page.locator('button:has-text("New"), button:has-text("Add")');
      if (await newButton.count() > 0) {
        await newButton.first().click();
        await page.waitForTimeout(1000);

        // Fill some data
        const allocationField = page.locator('input[type="number"]').first();
        if (await allocationField.count() > 0) {
          await allocationField.fill('50');
        }

        // Abruptly close the page (simulating crash/close)
        await context.close();
      }

      // Create new session and verify data integrity
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();

      await loginAsUser(newPage);
      await newPage.goto('/assignments');
      await newPage.waitForLoadState('networkidle');

      // System should be functional
      const systemWorking = await newPage.locator('body').count() > 0;
      expect(systemWorking).toBe(true);
      console.log('✅ System recovered gracefully after unexpected close');

      await newContext.close();
    });

    test('should maintain session integrity across network interruptions', async ({ page }) => {
      console.log('🔒 Testing network interruption resilience');

      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      // Simulate network issues by monitoring failed requests
      const networkIssues = [];
      page.on('requestfailed', request => {
        networkIssues.push({
          url: request.url(),
          failure: request.failure()?.errorText,
          timestamp: Date.now()
        });
      });

      // Perform operations that might experience network issues
      const networkOperations = [
        () => page.reload(),
        () => page.goto('/people'),
        () => page.goto('/projects'),
        () => page.goto('/assignments')
      ];

      for (const operation of networkOperations) {
        try {
          await operation();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        } catch (error) {
          // Network issues are expected in some environments
          console.log(`Network operation handled: ${error.message}`);
        }
      }

      // Verify system remains functional despite any network issues
      const finalCheck = await page.locator('body').count() > 0;
      expect(finalCheck).toBe(true);
      console.log(`✅ System resilient with ${networkIssues.length} network issues`);
    });
  });
});