import { test, expect } from '@playwright/test'
import { setupPageWithAuth } from './utils/improved-auth-helpers';;

test.describe('Simple Table Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL
    await setupPageWithAuth(page, '/');
    
    // Handle profile selection if it appears
    const profileModal = page.locator('text="Select Your Profile"');
    if (await profileModal.isVisible({ timeout: 5000 })) {
      // Select first profile
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      if (options.length > 1) {
        const value = await options[1].getAttribute('value');
        await select.selectOption(value!);
      }
      
      // Wait for Continue button and click it
      const continueBtn = page.locator('button:has-text("Continue")');
      await expect(continueBtn).toBeEnabled({ timeout: 10000 });
      await continueBtn.click();
      
      // Wait for profile modal to close
      await expect(profileModal).not.toBeVisible({ timeout: 10000 });
    }
    
    // Wait for the app to be ready
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  });

  test('can navigate to Projects page and see table', async ({ page }) => {
    // Navigate to projects
    await page.getByRole('link', { name: /projects/i }).click();
    
    // Wait for navigation
    await page.waitForURL('**/projects');
    
    // Check for table or no data message
    const table = page.locator('table').first();
    const noData = page.locator('text=/no.*data|no.*projects/i');
    
    // Either table or no data message should be visible
    const tableOrNoData = await Promise.race([
      table.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table'),
      noData.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'noData')
    ]).catch(() => null);
    
    expect(tableOrNoData).toBeTruthy();
    
    // If table is visible, check headers
    if (await table.isVisible()) {
      await expect(page.locator('th')).toHaveCount(7); // Expected number of columns
    }
  });

  test('can navigate to People page and see table', async ({ page }) => {
    // Navigate to people
    await page.getByRole('link', { name: /people/i }).click();
    
    // Wait for navigation
    await page.waitForURL('**/people');
    
    // Check for table or no data message
    const table = page.locator('table').first();
    const noData = page.locator('text=/no.*data|no.*people/i');
    
    // Either table or no data message should be visible
    const tableOrNoData = await Promise.race([
      table.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table'),
      noData.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'noData')
    ]).catch(() => null);
    
    expect(tableOrNoData).toBeTruthy();
    
    // If table is visible, check for expected headers
    if (await table.isVisible()) {
      const headers = ['NAME', 'PRIMARY ROLE', 'TYPE', 'LOCATION', 'AVAILABILITY', 'HOURS/DAY', 'ACTIONS'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
    }
  });

  test('can navigate to Assignments page and see content', async ({ page }) => {
    // Navigate to assignments
    await page.getByRole('link', { name: /assignments/i }).click();
    
    // Wait for navigation
    await page.waitForURL('**/assignments');
    
    // Check for page heading
    await expect(page.locator('h1:has-text("Assignments")')).toBeVisible({ timeout: 10000 });
    
    // Check for table or no data message
    const table = page.locator('table').first();
    const noData = page.locator('text=/no.*data|no.*assignments/i');
    
    // Either table or no data message should be visible
    const tableOrNoData = await Promise.race([
      table.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table'),
      noData.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'noData')
    ]).catch(() => null);
    
    expect(tableOrNoData).toBeTruthy();
  });

  test('can navigate to Reports page and see tabs', async ({ page }) => {
    // Navigate to reports
    await page.getByRole('link', { name: /reports/i }).click();
    
    // Wait for navigation
    await page.waitForURL('**/reports');
    
    // Check for report tabs
    await expect(page.locator('button:has-text("Demand Report")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Capacity Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Utilization Report")')).toBeVisible();
    // Check for either "Gaps Report" or "Gaps Analysis"
    const gapsButton = page.locator('button:has-text("Gaps Report"), button:has-text("Gaps Analysis"), button:has-text("Gaps")');
    await expect(gapsButton).toBeVisible();
  });
});