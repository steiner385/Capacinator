import { test, expect } from '@playwright/test';

test.describe('Scenario UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display scenario dropdown in header', async ({ page }) => {
    // Check that scenario dropdown exists
    await expect(page.locator('.scenario-selector')).toBeVisible();
    
    // Click to open dropdown
    await page.click('.scenario-selector');
    
    // Verify dropdown menu appears
    await expect(page.locator('.scenario-dropdown-menu')).toBeVisible();
    
    // Verify baseline scenario is present
    await expect(page.locator('.scenario-dropdown-menu').getByText('Baseline')).toBeVisible();
  });

  test('should switch scenarios from header dropdown', async ({ page }) => {
    // Create a test scenario first
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'UI Test Scenario');
    await page.fill('textarea[name="description"]', 'Testing UI scenario switching');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Go back to home
    await page.goto('/');
    
    // Open scenario dropdown
    await page.click('.scenario-selector');
    
    // Verify the new scenario appears in dropdown
    await expect(page.locator('.scenario-dropdown-menu').getByText('UI Test Scenario')).toBeVisible();
    
    // Click to select the new scenario
    await page.click('.scenario-dropdown-menu text="UI Test Scenario"');
    
    // Verify the header updates to show selected scenario
    await expect(page.locator('.scenario-selector')).toContainText('UI Test Scenario');
    
    // Verify localStorage is updated
    const scenarioContext = await page.evaluate(() => localStorage.getItem('currentScenario'));
    expect(scenarioContext).toBeTruthy();
    const parsed = JSON.parse(scenarioContext!);
    expect(parsed.name).toBe('UI Test Scenario');
  });

  test('should show scenario badges in assignments table', async ({ page }) => {
    // Create a branch scenario with assignments
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Badge Test Scenario');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Navigate to assignments
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Look for scenario badges
    const scenarioBadges = page.locator('.scenario-badge');
    const badgeCount = await scenarioBadges.count();
    
    // If there are scenario assignments, verify badges are displayed
    if (badgeCount > 0) {
      await expect(scenarioBadges.first()).toBeVisible();
      await expect(scenarioBadges.first()).toContainText(/Scenario|Badge Test Scenario/);
      
      // Verify badge styling
      const badgeStyle = await scenarioBadges.first().getAttribute('style');
      expect(badgeStyle).toContain('background');
      expect(badgeStyle).toContain('color');
    }
  });

  test('should display scenario context in demand report', async ({ page }) => {
    // Navigate to demand report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Check for scenario context display
    const contextDisplay = page.locator('div:has(svg) >> text="Current Scenario:"');
    await expect(contextDisplay).toBeVisible();
    
    // Verify it shows the current scenario name
    const contextContainer = page.locator('div:has(> div:has-text("Current Scenario:"))');
    await expect(contextContainer).toContainText(/Baseline|Current Scenario/);
    
    // Create and switch to a new scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Report Context Test');
    await page.fill('textarea[name="description"]', 'Testing report context display');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Switch to new scenario
    await page.click('.scenario-selector');
    await page.click('text="Report Context Test"');
    await page.waitForTimeout(500);
    
    // Go back to demand report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Verify context updated
    await expect(contextContainer).toContainText('Report Context Test');
    await expect(contextContainer).toContainText('Testing report context display');
  });

  test('should style baseline vs branch scenarios differently', async ({ page }) => {
    // Navigate to demand report with baseline scenario
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Get baseline scenario context style
    const baselineContext = page.locator('div:has(> div:has-text("Current Scenario:"))');
    const baselineStyle = await baselineContext.getAttribute('style');
    
    // Create a branch scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Style Test Branch');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Switch to branch scenario
    await page.click('.scenario-selector');
    await page.click('text="Style Test Branch"');
    await page.waitForTimeout(500);
    
    // Go back to demand report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Get branch scenario context style
    const branchContext = page.locator('div:has(> div:has-text("Current Scenario:"))');
    const branchStyle = await branchContext.getAttribute('style');
    
    // Verify styles are different
    expect(baselineStyle).not.toBe(branchStyle);
    expect(baselineStyle).toContain('var(--bg-secondary)');
    expect(branchStyle).toContain('var(--primary-light)');
  });

  test('should persist scenario selection on page reload', async ({ page }) => {
    // Create and select a scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Persistence Test Scenario');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Persistence Test Scenario"');
    await page.waitForTimeout(500);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify scenario is still selected
    await expect(page.locator('.scenario-selector')).toContainText('Persistence Test Scenario');
    
    // Verify localStorage still has the scenario
    const scenarioContext = await page.evaluate(() => localStorage.getItem('currentScenario'));
    const parsed = JSON.parse(scenarioContext!);
    expect(parsed.name).toBe('Persistence Test Scenario');
  });

  test('should update assignment date mode badges correctly', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Check for date mode badges
    const modeBadges = page.locator('.assignment-mode-badge');
    const badgeCount = await modeBadges.count();
    
    if (badgeCount > 0) {
      // Verify badge text matches expected values
      const badgeTexts = await modeBadges.allTextContents();
      badgeTexts.forEach(text => {
        expect(['Fixed', 'Project', 'Phase']).toContain(text);
      });
    }
  });

  test('should handle scenario dropdown with many scenarios', async ({ page }) => {
    // Create multiple scenarios to test scrolling/pagination
    const scenarioNames = [];
    for (let i = 1; i <= 5; i++) {
      await page.goto('/scenarios');
      await page.click('button:has-text("Create Scenario")');
      const name = `Test Scenario ${i}`;
      scenarioNames.push(name);
      await page.fill('input[name="name"]', name);
      await page.click('button:has-text("Create")');
      await page.waitForLoadState('networkidle');
    }
    
    // Open scenario dropdown
    await page.click('.scenario-selector');
    
    // Verify all scenarios are visible in dropdown
    for (const name of scenarioNames) {
      await expect(page.locator('.scenario-dropdown-menu').getByText(name)).toBeVisible();
    }
    
    // Verify dropdown is scrollable if needed
    const dropdownMenu = page.locator('.scenario-dropdown-menu');
    const menuHeight = await dropdownMenu.evaluate(el => el.scrollHeight);
    const visibleHeight = await dropdownMenu.evaluate(el => el.clientHeight);
    
    // If menu is taller than visible area, it should be scrollable
    if (menuHeight > visibleHeight) {
      const overflow = await dropdownMenu.evaluate(el => 
        window.getComputedStyle(el).overflowY
      );
      expect(['scroll', 'auto']).toContain(overflow);
    }
  });
});