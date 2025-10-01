/**
 * Scenario Comparison Modal Tests
 * Specific tests for scenario comparison modal to ensure proper styling
 */
import { test, expect } from '../../fixtures';
import { ScenarioTestUtils, createUniqueTestPrefix, waitForSync } from '../../helpers/scenario-test-utils';

test.describe('Scenario Comparison Modal Styling', () => {
  let scenarioUtils: ScenarioTestUtils;
  let testScenarioIds: string[] = [];

  test.beforeEach(async ({ authenticatedPage, apiContext, testDataHelpers, testHelpers }) => {
    const prefix = createUniqueTestPrefix('modaltest');
    
    scenarioUtils = new ScenarioTestUtils({
      page: authenticatedPage,
      apiContext,
      testPrefix: prefix
    });

    // Get user ID
    let userId = '';
    try {
      const profileResponse = await apiContext.get('/api/profile');
      if (profileResponse.ok()) {
        const profile = await profileResponse.json();
        userId = profile.person?.id || '';
      }
    } catch (error) {
      console.log('Could not get profile:', error);
    }
    
    if (!userId) {
      const testUser = await testDataHelpers.createTestUser({ prefix });
      userId = testUser.id;
    }

    // Create test scenarios for comparison
    const scenarios = [
      { name: `${prefix}-Baseline`, scenario_type: 'baseline', status: 'active' },
      { name: `${prefix}-Branch-1`, scenario_type: 'branch', status: 'active' },
      { name: `${prefix}-Branch-2`, scenario_type: 'branch', status: 'draft' }
    ];

    for (const scenarioData of scenarios) {
      const response = await apiContext.post('/api/scenarios', {
        data: { ...scenarioData, created_by: userId }
      });
      
      if (response.ok()) {
        const scenario = await response.json();
        testScenarioIds.push(scenario.id);
      }
    }

    await testHelpers.navigateTo('/scenarios');
    await testHelpers.waitForPageContent();
    await scenarioUtils.waitForScenariosToLoad();
  });

  test.afterEach(async ({ apiContext }) => {
    // Clean up test scenarios
    for (const id of testScenarioIds) {
      try {
        await apiContext.delete(`/api/scenarios/${id}`);
      } catch (error) {
        console.log(`Failed to delete scenario ${id}:`, error);
      }
    }
  });

  test('Comparison modal should have solid background overlay', async ({ authenticatedPage }) => {
    // Find a scenario with compare button
    const firstScenarioRow = authenticatedPage.locator('.hierarchy-row').first();
    const compareButton = firstScenarioRow.locator('button[title*="Compare"], .action-button.compare').first();
    
    if (!await compareButton.isVisible()) {
      // Try global compare button
      const globalCompareBtn = authenticatedPage.locator('button:has-text("Compare Scenarios")').first();
      if (await globalCompareBtn.isVisible()) {
        await globalCompareBtn.click();
      } else {
        test.skip();
        return;
      }
    } else {
      await compareButton.click();
    }

    // Wait for modal to appear
    const modal = authenticatedPage.locator('.scenario-comparison-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check overlay background
    const overlay = authenticatedPage.locator('.modal-overlay, .modal-backdrop').first();
    const overlayStyles = await overlay.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        opacity: computed.opacity,
        backdropFilter: computed.backdropFilter,
        position: computed.position,
        zIndex: computed.zIndex
      };
    });

    console.log('Overlay styles:', overlayStyles);

    // Verify overlay has solid dark background
    expect(overlayStyles.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0/); // Should be black with opacity
    expect(overlayStyles.position).toBe('fixed');
    expect(parseInt(overlayStyles.zIndex)).toBeGreaterThan(100);

    // Check for opacity in rgba
    if (overlayStyles.backgroundColor.includes('rgba')) {
      const alphaMatch = overlayStyles.backgroundColor.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/);
      if (alphaMatch) {
        const alpha = parseFloat(alphaMatch[1]);
        expect(alpha).toBeGreaterThanOrEqual(0.5); // Should be at least 50% opaque
      }
    }

    // Check modal content background
    const modalContent = modal.locator('.modal-content, .modal-body, [role="dialog"] > div').first();
    const contentStyles = await modalContent.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        opacity: computed.opacity
      };
    });

    console.log('Modal content styles:', contentStyles);

    // Verify modal content has solid background
    expect(contentStyles.backgroundColor).not.toBe('transparent');
    expect(contentStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(contentStyles.opacity)).toBe(1);

    // Check specific panels within comparison modal
    const panels = modal.locator('.scenario-info-panel, .comparison-setup').all();
    for (const panel of await panels) {
      const panelStyles = await panel.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.backgroundColor;
      });
      
      expect(panelStyles).not.toBe('transparent');
    }
  });

  test('Comparison modal should maintain solid background during interactions', async ({ authenticatedPage }) => {
    // Open comparison modal
    const compareButton = authenticatedPage.locator('button:has-text("Compare"), button[title*="Compare"]').first();
    if (!await compareButton.isVisible()) {
      test.skip();
      return;
    }
    
    await compareButton.click();
    const modal = authenticatedPage.locator('.scenario-comparison-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Select scenarios for comparison
    const scenarioSelects = modal.locator('select').all();
    if ((await scenarioSelects).length >= 2) {
      // Select first two scenarios
      const selects = await scenarioSelects;
      await selects[0].selectOption({ index: 1 });
      await waitForSync(authenticatedPage);
      await selects[1].selectOption({ index: 2 });
      await waitForSync(authenticatedPage);

      // Click compare button
      const runCompareBtn = modal.locator('button:has-text("Compare"), button:has-text("Run Comparison")').first();
      if (await runCompareBtn.isVisible()) {
        await runCompareBtn.click();
        await waitForSync(authenticatedPage);

        // Check background is still solid after state change
        const overlay = authenticatedPage.locator('.modal-overlay, .modal-backdrop').first();
        const overlayBg = await overlay.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        
        expect(overlayBg).toMatch(/rgba?\(0,\s*0,\s*0/);
        expect(overlayBg).not.toBe('transparent');
      }
    }
  });

  test('Comparison modal should handle theme changes', async ({ authenticatedPage }) => {
    // Check if theme toggle exists
    const themeToggle = authenticatedPage.locator('[data-testid="theme-toggle"], button[title*="theme"], button[aria-label*="theme"]').first();
    
    if (await themeToggle.isVisible()) {
      // Open modal
      const compareButton = authenticatedPage.locator('button:has-text("Compare"), button[title*="Compare"]').first();
      if (!await compareButton.isVisible()) {
        test.skip();
        return;
      }
      
      await compareButton.click();
      const modal = authenticatedPage.locator('.scenario-comparison-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Toggle theme
      await themeToggle.click();
      await waitForSync(authenticatedPage);

      // Check modal still has solid background
      const overlay = authenticatedPage.locator('.modal-overlay, .modal-backdrop').first();
      const overlayStyles = await overlay.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          opacity: computed.opacity
        };
      });

      expect(overlayStyles.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0/);
      expect(overlayStyles.backgroundColor).not.toBe('transparent');
    }
  });

  test('Comparison modal visual regression test', async ({ authenticatedPage }) => {
    const compareButton = authenticatedPage.locator('button:has-text("Compare"), button[title*="Compare"]').first();
    if (!await compareButton.isVisible()) {
      test.skip();
      return;
    }
    
    await compareButton.click();
    const modal = authenticatedPage.locator('.scenario-comparison-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Take screenshot for visual comparison
    await authenticatedPage.screenshot({
      path: 'test-results/modal-backgrounds/scenario-comparison-modal.png',
      fullPage: true,
      animations: 'disabled'
    });

    // Also take a screenshot with content
    const scenarioSelects = modal.locator('select').all();
    if ((await scenarioSelects).length >= 2) {
      const selects = await scenarioSelects;
      await selects[0].selectOption({ index: 1 });
      await waitForSync(authenticatedPage);
      
      await authenticatedPage.screenshot({
        path: 'test-results/modal-backgrounds/scenario-comparison-modal-with-content.png',
        fullPage: true,
        animations: 'disabled'
      });
    }
  });
});