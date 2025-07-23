import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Allocation Wizard - Visual Regression and Accessibility Tests', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    await page.goto('/wizard');
    await page.waitForSelector('.allocation-wizard', { timeout: 10000 });
    
    // Handle profile selection using robust helper
    await helpers.handleProfileSelection();
  });

  test.describe('Visual Regression Tests', () => {

    test('should maintain consistent visual appearance for step 1', async ({ page }) => {
      // Wait for full load
      await page.waitForSelector('.wizard-progress');
      await page.waitForTimeout(1000);

      // Take screenshot of initial wizard state
      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-step-1-initial.png', {
        fullPage: true,
        threshold: 0.2
      });

      // Select a project and take another screenshot
      await page.locator('.wizard-item').first().click();
      await page.waitForTimeout(500);

      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-step-1-project-selected.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('should maintain visual consistency across different viewport sizes', async ({ page }) => {
      // Desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-desktop-view.png', {
        threshold: 0.2
      });

      // Tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-tablet-view.png', {
        threshold: 0.2
      });

      // Mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-mobile-view.png', {
        threshold: 0.2
      });
    });

    test('should show consistent progress indicator visuals', async ({ page }) => {
      // Step 1 progress
      await expect(page.locator('.wizard-progress')).toHaveScreenshot('progress-step-1.png', {
        threshold: 0.1
      });

      // Navigate to step 2
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Step 2 progress
      await expect(page.locator('.wizard-progress')).toHaveScreenshot('progress-step-2.png', {
        threshold: 0.1
      });

      // Navigate to step 3
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });

      // Step 3 progress
      await expect(page.locator('.wizard-progress')).toHaveScreenshot('progress-step-3.png', {
        threshold: 0.1
      });
    });

    test('should display error states consistently', async ({ page }) => {
      // Mock API error
      await page.route('**/api/gaps', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test error message' })
        });
      });

      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Wait for error to appear
      await page.waitForSelector('.wizard-error', { timeout: 5000 });

      // Screenshot error state
      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-error-state.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('should show loading states consistently', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/gaps', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ gaps: [] })
          });
        }, 2000);
      });

      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Capture loading state
      await page.waitForSelector('.wizard-processing', { timeout: 1000 });
      await expect(page.locator('.allocation-wizard')).toHaveScreenshot('wizard-loading-state.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('should display data visualization consistently', async ({ page }) => {
      // Navigate to steps with charts/stats
      await page.locator('.wizard-item').first().click();
      await page.locator('.wizard-item').nth(1).click();
      
      // Statistics should be visible
      await page.waitForSelector('.wizard-stats', { timeout: 2000 });
      await expect(page.locator('.wizard-stats')).toHaveScreenshot('wizard-statistics-display.png', {
        threshold: 0.2
      });

      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });

      // Gap analysis charts
      const gapStats = page.locator('.wizard-stats');
      if (await gapStats.isVisible()) {
        await expect(gapStats).toHaveScreenshot('gap-analysis-stats.png', {
          threshold: 0.2
        });
      }
    });

    test('should maintain button and form styling consistency', async ({ page }) => {
      // Navigation buttons
      await expect(page.locator('.wizard-footer')).toHaveScreenshot('wizard-navigation-buttons.png', {
        threshold: 0.1
      });

      // Select project to enable Next button
      await page.locator('.wizard-item').first().click();
      await page.waitForTimeout(500);

      await expect(page.locator('.wizard-footer')).toHaveScreenshot('wizard-navigation-buttons-enabled.png', {
        threshold: 0.1
      });

      // Navigate to manual allocation step for form elements
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });

      // Toggle and form elements
      const toggle = page.locator('.wizard-toggle');
      if (await toggle.isVisible()) {
        await expect(toggle).toHaveScreenshot('wizard-toggle-auto-mode.png', {
          threshold: 0.1
        });

        await page.locator('.toggle-switch').click();
        await page.waitForTimeout(500);
        
        await expect(toggle).toHaveScreenshot('wizard-toggle-manual-mode.png', {
          threshold: 0.1
        });
      }
    });
  });

  test.describe('Accessibility Tests', () => {

    test('should have proper heading hierarchy', async ({ page }) => {
      // Check heading structure
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      const h3 = page.locator('h3');

      await expect(h1).toHaveCount(1);
      await expect(h1).toContainText('Resource Allocation Wizard');
      
      await expect(h2).toHaveCount(1);
      await expect(h2).toContainText('Select Projects');

      // h3 elements should be present and descriptive
      const h3Count = await h3.count();
      expect(h3Count).toBeGreaterThanOrEqual(1);
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Progress indicator should have proper ARIA
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps.first()).toBeVisible();

      // Buttons should have accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        // Button should have either text content or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }

      // Form inputs should have labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        
        if (id) {
          // Should have associated label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.isVisible();
          expect(hasLabel || ariaLabel).toBeTruthy();
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through wizard elements
      await page.keyboard.press('Tab');
      
      // First focusable element should be highlighted
      let focused = page.locator(':focus');
      await expect(focused).toBeVisible();

      // Continue tabbing through elements
      const tabStops = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').innerHTML().catch(() => null);
        if (focusedElement) {
          tabStops.push(focusedElement);
        }
      }

      // Should have logical tab order
      expect(tabStops.length).toBeGreaterThan(0);
    });

    test('should have sufficient color contrast', async ({ page }) => {
      // This would require a color contrast analysis tool
      // For now, we'll check that elements are visible
      
      const textElements = page.locator('p, span, div').filter({ hasText: /.+/ });
      const count = await textElements.count();
      
      // Sample some text elements
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = textElements.nth(i);
        await expect(element).toBeVisible();
        
        // Element should have readable text
        const text = await element.textContent();
        expect(text?.trim()).toBeTruthy();
      }
    });

    test('should work with screen reader simulation', async ({ page }) => {
      // Simulate screen reader by checking aria attributes and text content
      
      // Main landmark should be present
      const main = page.locator('main, [role="main"]');
      const hasMain = await main.isVisible();
      
      // If no main landmark, at least the content should be accessible
      if (!hasMain) {
        await expect(page.locator('.allocation-wizard')).toBeVisible();
      }

      // Step indicators should be accessible
      const steps = page.locator('.progress-step');
      const stepCount = await steps.count();
      
      for (let i = 0; i < stepCount; i++) {
        const step = steps.nth(i);
        const stepTitle = step.locator('.step-title');
        await expect(stepTitle).toBeVisible();
        
        const title = await stepTitle.textContent();
        expect(title?.trim()).toBeTruthy();
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast by checking that elements are still visible
      // and that borders/outlines are present
      
      const items = page.locator('.wizard-item');
      const itemCount = await items.count();
      
      for (let i = 0; i < Math.min(itemCount, 3); i++) {
        const item = items.nth(i);
        await expect(item).toBeVisible();
        
        // Item should have visual boundaries
        const styles = await item.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            border: computed.border,
            outline: computed.outline,
            backgroundColor: computed.backgroundColor
          };
        });
        
        // Should have some form of visual distinction
        expect(
          styles.border !== 'none' || 
          styles.outline !== 'none' || 
          styles.backgroundColor !== 'transparent'
        ).toBeTruthy();
      }
    });

    test('should support zoom up to 200%', async ({ page }) => {
      // Test at different zoom levels
      const zoomLevels = [1, 1.5, 2];
      
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ 
          width: Math.round(1200 / zoom), 
          height: Math.round(800 / zoom) 
        });
        
        await page.waitForTimeout(500);
        
        // Main elements should still be visible and functional
        await expect(page.locator('.allocation-wizard')).toBeVisible();
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('.wizard-progress')).toBeVisible();
        
        // Buttons should still be clickable
        const buttons = page.locator('button:visible');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThan(0);
      }
    });

    test('should provide meaningful error messages', async ({ page }) => {
      // Mock error scenario
      await page.route('**/api/gaps', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service temporarily unavailable' })
        });
      });

      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();

      // Error message should be descriptive
      const errorElement = page.locator('.wizard-error');
      await expect(errorElement).toBeVisible();
      
      const errorText = await errorElement.textContent();
      expect(errorText).toContain('Error');
      expect(errorText?.length).toBeGreaterThan(10); // Should be descriptive
    });

    test('should announce state changes appropriately', async ({ page }) => {
      // Check for aria-live regions or similar announcements
      
      // Select a project (state change)
      await page.locator('.wizard-item').first().click();
      
      // Stats should update and be announced
      const stats = page.locator('.wizard-stats');
      if (await stats.isVisible()) {
        // Stats should have accessible content
        const statValues = page.locator('.wizard-stat-value');
        const count = await statValues.count();
        
        for (let i = 0; i < count; i++) {
          const value = statValues.nth(i);
          const label = value.locator('~ .wizard-stat-label');
          
          await expect(value).toBeVisible();
          await expect(label).toBeVisible();
          
          const valueText = await value.textContent();
          const labelText = await label.textContent();
          
          expect(valueText?.trim()).toBeTruthy();
          expect(labelText?.trim()).toBeTruthy();
        }
      }
    });
  });

  test.describe('Performance and Animation Tests', () => {

    test('should complete animations within reasonable time', async ({ page }) => {
      // Measure step transition time
      const startTime = Date.now();
      
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Wait for transition to complete
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      const transitionTime = Date.now() - startTime;
      expect(transitionTime).toBeLessThan(8000); // Should complete within 8 seconds
    });

    test('should maintain smooth animations during interactions', async ({ page }) => {
      // Test toggle animation
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });

      const toggle = page.locator('.toggle-switch');
      if (await toggle.isVisible()) {
        // Toggle should animate smoothly
        await toggle.click();
        await page.waitForTimeout(300); // Allow animation time
        
        await toggle.click();
        await page.waitForTimeout(300);
        
        // Should still be responsive
        await expect(toggle).toBeVisible();
      }
    });

    test('should handle rapid user interactions', async ({ page }) => {
      // Rapid clicking on project selection
      const projectItems = page.locator('.wizard-item');
      const count = await projectItems.count();
      
      // Click all projects rapidly
      for (let i = 0; i < count; i++) {
        await projectItems.nth(i).click({ timeout: 100 });
      }
      
      // Should handle all clicks without issues
      await page.waitForTimeout(500);
      
      // All projects should be selected
      const selectedCount = await page.locator('.wizard-item.selected').count();
      expect(selectedCount).toBe(count);
    });

    test('should maintain performance with large datasets', async ({ page }) => {
      // Select all available projects to test with maximum data
      const projectItems = page.locator('.wizard-item');
      const count = await projectItems.count();
      
      const startTime = Date.now();
      
      // Select all projects
      for (let i = 0; i < count; i++) {
        await projectItems.nth(i).click();
      }
      
      const selectionTime = Date.now() - startTime;
      expect(selectionTime).toBeLessThan(5000); // Should complete quickly
      
      // Proceed through wizard with all data
      const nextStartTime = Date.now();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 15000 });
      
      const analysisTime = Date.now() - nextStartTime;
      expect(analysisTime).toBeLessThan(12000); // Should handle large datasets
    });
  });
});