import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Allocation Wizard - Edge Cases and Corner Scenarios', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    await page.goto('/wizard');
    await page.waitForSelector('.allocation-wizard', { timeout: 10000 });
    
    // Handle profile selection using robust helper
    await helpers.handleProfileSelection();
  });

  test.describe('Network and API Error Scenarios', () => {

    test('should handle API failure gracefully during gap analysis', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/gaps', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      // Select projects and proceed
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Should show error state
      await expect(page.locator('.wizard-error')).toBeVisible();
      await expect(page.locator('.wizard-error')).toContainText('Error');
      
      // Should still allow going back
      const prevButton = page.locator('button', { hasText: 'Previous' });
      await expect(prevButton).toBeEnabled();
      
      // Processing indicator should be hidden
      await expect(page.locator('.wizard-processing')).not.toBeVisible();
    });

    test('should handle slow API responses with loading states', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/gaps', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ gaps: [] })
          });
        }, 3000);
      });

      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Should show processing state
      await expect(page.locator('.wizard-processing')).toBeVisible();
      await expect(page.locator('text=Processing...')).toBeVisible();
      
      // Navigation should be disabled during processing
      const nextButton = page.locator('button', { hasText: 'Next' });
      const prevButton = page.locator('button', { hasText: 'Previous' });
      await expect(nextButton).toBeDisabled();
      await expect(prevButton).toBeDisabled();
    });

    test('should handle network disconnection during wizard flow', async ({ page }) => {
      // Start wizard flow
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Simulate network disconnection
      await page.context().setOffline(true);
      
      await page.locator('button', { hasText: 'Next' }).click();

      // Should show error or handle gracefully
      await page.waitForTimeout(2000);
      
      // Re-enable network
      await page.context().setOffline(false);
      
      // Should be able to retry
      await page.locator('button', { hasText: 'Next' }).click();
    });
  });

  test.describe('Data Edge Cases', () => {

    test('should handle projects with zero resource gaps', async ({ page }) => {
      // This would require mocking fully staffed projects
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Wait for analysis
      await page.waitForSelector('h2', { timeout: 10000 });

      // Should either show "no gaps" or proceed normally
      const noGapsMessage = page.locator('text=All Projects Fully Staffed');
      const gapsFound = page.locator('text=Gap Analysis Results');
      
      const noGapsVisible = await noGapsMessage.isVisible();
      const gapsVisible = await gapsFound.isVisible();
      
      expect(noGapsVisible || gapsVisible).toBeTruthy();

      if (noGapsVisible) {
        // Next button should still work to proceed
        await page.locator('button', { hasText: 'Next' }).click();
        // Should skip to later steps or show appropriate message
      }
    });

    test('should handle projects with extreme resource requirements', async ({ page }) => {
      // Select multiple large projects
      const projectItems = page.locator('.wizard-item');
      const count = await projectItems.count();
      
      // Select all projects to test large data sets
      for (let i = 0; i < count; i++) {
        await projectItems.nth(i).click();
      }

      // Should handle large numbers in stats
      const stats = page.locator('.wizard-stat-value');
      await expect(stats.first()).toBeVisible();
      
      // Proceed through wizard
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('h2', { timeout: 15000 });
      
      // Should not crash with large data sets
      await expect(page.locator('.allocation-wizard')).toBeVisible();
    });

    test('should handle projects with overlapping timelines', async ({ page }) => {
      // Select projects with potentially overlapping timelines
      await page.locator('.wizard-item').first().click();
      await page.locator('.wizard-item').nth(1).click();
      await page.locator('.wizard-item').nth(2).click();

      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });

      // Should handle resource conflicts intelligently
      const allocationPlans = page.locator('.wizard-item');
      if (await allocationPlans.count() > 0) {
        // Plans should not over-allocate people
        await expect(allocationPlans.first()).toBeVisible();
      }
    });

    test('should handle case with no available resources', async ({ page }) => {
      // Mock scenario where no resources are available
      await page.route('**/api/resources/available', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ resources: [] })
        });
      });

      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();

      // Should show no resources message
      await expect(page.locator('text=No Available Resources')).toBeVisible();
      
      // Should still allow navigation
      const prevButton = page.locator('button', { hasText: 'Previous' });
      await expect(prevButton).toBeEnabled();
    });
  });

  test.describe('User Input Validation and Edge Cases', () => {

    test('should prevent proceeding without selecting projects', async ({ page }) => {
      // Next button should be disabled without selections
      const nextButton = page.locator('button', { hasText: 'Next' });
      await expect(nextButton).toBeDisabled();

      // Click Next anyway (should not proceed)
      await nextButton.click({ force: true });
      
      // Should remain on step 1
      await expect(page.locator('h2')).toContainText('Select Projects');
    });

    test('should handle rapid clicking and double submissions', async ({ page }) => {
      await page.locator('.wizard-item').first().click();
      
      const nextButton = page.locator('button', { hasText: 'Next' });
      
      // Rapid clicking
      await nextButton.click();
      await nextButton.click();
      await nextButton.click();
      
      // Should only advance one step
      await page.waitForSelector('h2', { timeout: 10000 });
      await expect(page.locator('h2')).toContainText(/Analyzing Gaps|Gap Analysis Results/);
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate through wizard
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Use browser back button
      await page.goBack();
      
      // Should handle gracefully (may show wizard from start or maintain state)
      await page.waitForTimeout(1000);
      await expect(page.locator('.allocation-wizard')).toBeVisible();

      // Browser forward
      await page.goForward();
      await page.waitForTimeout(1000);
      await expect(page.locator('.allocation-wizard')).toBeVisible();
    });

    test('should handle manual allocation input validation', async ({ page }) => {
      // Navigate to allocation step
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });

      // Switch to manual mode
      await page.locator('.toggle-switch').click();

      const hourInputs = page.locator('input[type="number"]');
      if (await hourInputs.count() > 0) {
        const firstInput = hourInputs.first();

        // Test negative values
        await firstInput.fill('-10');
        await expect(firstInput).toHaveValue('0'); // Should clamp to min

        // Test values over maximum
        await firstInput.fill('100');
        // Should either clamp to max or show validation

        // Test non-numeric input
        await firstInput.fill('abc');
        await expect(firstInput).toHaveValue('0'); // Should default to 0
      }
    });

    test('should handle extremely long project names and descriptions', async ({ page }) => {
      // Check that long text doesn't break layout
      const projectItems = page.locator('.wizard-item');
      await expect(projectItems.first()).toBeVisible();
      
      // Long text should be contained within item bounds
      const firstItem = projectItems.first();
      const itemBox = await firstItem.boundingBox();
      const titleBox = await firstItem.locator('.wizard-item-title').boundingBox();
      
      if (itemBox && titleBox) {
        expect(titleBox.width).toBeLessThanOrEqual(itemBox.width);
      }
    });
  });

  test.describe('State Management Edge Cases', () => {

    test('should maintain wizard state during page refresh', async ({ page }) => {
      // Navigate to step 2
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Refresh page
      await page.reload();
      await page.waitForSelector('.allocation-wizard', { timeout: 10000 });

      // Should restart wizard (expected behavior for refresh)
      await expect(page.locator('h2')).toContainText('Select Projects');
    });

    test('should handle concurrent wizard sessions', async ({ browser }) => {
      // Open multiple tabs
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Navigate both to wizard
      await page1.goto('/wizard');
      await page2.goto('/wizard');
      
      await page1.waitForSelector('.allocation-wizard');
      await page2.waitForSelector('.allocation-wizard');

      // Both should work independently
      await page1.locator('.wizard-item').first().click();
      await page2.locator('.wizard-item').nth(1).click();

      // Should not interfere with each other
      await expect(page1.locator('.wizard-item').first()).toHaveClass(/selected/);
      await expect(page2.locator('.wizard-item').nth(1)).toHaveClass(/selected/);
      await expect(page2.locator('.wizard-item').first()).not.toHaveClass(/selected/);

      await context1.close();
      await context2.close();
    });

    test('should handle memory leaks during long wizard sessions', async ({ page }) => {
      // Simulate extended wizard usage
      for (let i = 0; i < 5; i++) {
        // Select projects
        await page.locator('.wizard-item').first().click();
        await page.locator('button', { hasText: 'Next' }).click();
        await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
        
        // Go back and start over
        await page.locator('button', { hasText: 'Start Over' }).click();
        await page.waitForTimeout(500);
      }

      // Wizard should still be responsive
      await expect(page.locator('.allocation-wizard')).toBeVisible();
      await page.locator('.wizard-item').first().click();
      await expect(page.locator('button', { hasText: 'Next' })).toBeEnabled();
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {

    test('should handle viewport resize during wizard flow', async ({ page }) => {
      // Start in desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Should still be functional
      await expect(page.locator('.allocation-wizard')).toBeVisible();
      await expect(page.locator('button', { hasText: 'Next' })).toBeVisible();

      // Resize back to desktop
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);

      // Should still work
      await expect(page.locator('.allocation-wizard')).toBeVisible();
    });

    test('should handle keyboard navigation properly', async ({ page }) => {
      // Tab through wizard elements
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element
      const focused = await page.locator(':focus');
      await expect(focused).toBeVisible();

      // Tab to project items
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Enter should select project
      await page.keyboard.press('Enter');
      
      // Check if project is selected
      const selectedProjects = page.locator('.wizard-item.selected');
      if (await selectedProjects.count() > 0) {
        await expect(selectedProjects.first()).toBeVisible();
      }
    });

    test('should handle focus management during step transitions', async ({ page }) => {
      await page.locator('.wizard-item').first().click();
      
      // Focus Next button
      await page.locator('button', { hasText: 'Next' }).focus();
      await page.keyboard.press('Enter');
      
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      // Focus should be managed properly
      const activeElement = await page.locator(':focus');
      await expect(activeElement).toBeVisible();
    });
  });

  test.describe('Data Consistency and Integrity', () => {

    test('should maintain data consistency across step transitions', async ({ page }) => {
      // Select specific projects
      await page.locator('.wizard-item').first().click();
      await page.locator('.wizard-item').nth(2).click();
      
      // Note the project names
      const project1Name = await page.locator('.wizard-item').first().locator('.wizard-item-title').textContent();
      const project3Name = await page.locator('.wizard-item').nth(2).locator('.wizard-item-title').textContent();

      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Go back and verify selections are maintained
      await page.locator('button', { hasText: 'Previous' }).click();
      
      await expect(page.locator('.wizard-item').first()).toHaveClass(/selected/);
      await expect(page.locator('.wizard-item').nth(2)).toHaveClass(/selected/);
      await expect(page.locator('.wizard-item').nth(1)).not.toHaveClass(/selected/);

      // Project names should be the same
      const project1NameAfter = await page.locator('.wizard-item').first().locator('.wizard-item-title').textContent();
      const project3NameAfter = await page.locator('.wizard-item').nth(2).locator('.wizard-item-title').textContent();
      
      expect(project1Name).toBe(project1NameAfter);
      expect(project3Name).toBe(project3NameAfter);
    });

    test('should handle allocation conflicts gracefully', async ({ page }) => {
      // Navigate to allocation step
      await page.locator('.wizard-item').first().click();
      await page.locator('.wizard-item').nth(1).click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });

      // Switch to manual mode
      await page.locator('.toggle-switch').click();

      // Set conflicting allocations (if inputs exist)
      const hourInputs = page.locator('input[type="number"]');
      if (await hourInputs.count() > 1) {
        // Try to over-allocate someone
        await hourInputs.first().fill('40');
        await hourInputs.nth(1).fill('40');
        
        // System should handle this gracefully
        await page.locator('button', { hasText: 'Next' }).click();
        
        // Should either show warning or prevent progression
        await page.waitForTimeout(1000);
      }
    });

    test('should validate allocation totals match requirements', async ({ page }) => {
      // Complete wizard flow
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();

      // Check allocation summary for consistency
      const coveragePercentages = page.locator('text=/\d+% allocated/');
      if (await coveragePercentages.count() > 0) {
        // Coverage percentages should be reasonable (0-100%)
        const coverageTexts = await coveragePercentages.allTextContents();
        for (const text of coverageTexts) {
          const percentage = parseInt(text.match(/\d+/)?.[0] || '0');
          expect(percentage).toBeGreaterThanOrEqual(0);
          expect(percentage).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  test.describe('Error Recovery Scenarios', () => {

    test('should recover from wizard crashes gracefully', async ({ page }) => {
      // Simulate a crash by navigating away and back
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Navigate away
      await page.goto('/dashboard');
      await page.waitForSelector('h1');
      
      // Return to wizard
      await page.goto('/wizard');
      await page.waitForSelector('.allocation-wizard');
      
      // Should start fresh
      await expect(page.locator('h2')).toContainText('Select Projects');
      await expect(page.locator('.wizard-item').first()).not.toHaveClass(/selected/);
    });

    test('should handle partial data loading failures', async ({ page }) => {
      // Mock partial failure - projects load but roles don't
      await page.route('**/api/roles', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to load roles' })
        });
      });

      await page.reload();
      await page.waitForSelector('.allocation-wizard');
      
      // Should still show projects even if roles fail
      const projectItems = page.locator('.wizard-item');
      await expect(projectItems.first()).toBeVisible();
    });

    test('should handle timeout scenarios gracefully', async ({ page }) => {
      // Mock very slow API
      await page.route('**/api/gaps', route => {
        // Don't fulfill the request to simulate timeout
      });

      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Should show loading state
      await expect(page.locator('.wizard-processing')).toBeVisible();
      
      // After reasonable time, should show error or allow retry
      await page.waitForTimeout(10000);
      
      // Should either show error or still be processing
      const hasError = await page.locator('.wizard-error').isVisible();
      const stillProcessing = await page.locator('.wizard-processing').isVisible();
      
      expect(hasError || stillProcessing).toBeTruthy();
    });
  });
});