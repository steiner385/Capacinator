import { test, expect } from '@playwright/test';

async function loginAsUser(page: any) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // Click the combobox to open it
  const loginSelect = page.locator('#person-select');
  await loginSelect.waitFor({ state: 'visible' });
  await loginSelect.click();
  
  // Wait for dropdown to open and select the first option
  await page.locator('[role="option"]').first().click();
  
  const loginButton = page.getByRole('button', { name: 'Continue' });
  await loginButton.click();
  
  // Wait for navigation to dashboard or any authenticated page
  await page.waitForURL((url) => url.pathname !== '/', { waitUntil: 'domcontentloaded', timeout: 10000 });
}

async function navigateToProjectDetail(page: any) {
  await page.goto('/projects');
  await page.waitForSelector('table tbody tr', { timeout: 10000 });
  // Click on View Details button for first project
  await page.locator('table tbody tr').first().getByRole('button', { name: 'View Details' }).click();
  await page.waitForSelector('.project-phase-manager', { timeout: 10000 });
}

test.describe('Phase Duplication - Simplified Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('basic phase duplication workflow', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // 1. Check Add Phase button is enabled (no selection needed anymore)
    const addPhaseButton = page.getByRole('button', { name: /add phase/i });
    await expect(addPhaseButton).toBeEnabled();
    
    // 2. Click Add Phase button
    await addPhaseButton.click();
    
    // 3. Modal should appear with phase type selection
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.getByText('What type of phase would you like to add?')).toBeVisible();
    
    // 4. Select duplicate option
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // 5. Source phase dropdown should be visible
    await expect(page.locator('select[name="source_phase"]')).toBeVisible();
    
    // 6. Select a source phase
    await page.locator('select[name="source_phase"]').selectOption({ index: 1 });
    
    // 7. Check placement options are visible
    await expect(page.getByText('Placement')).toBeVisible();
    
    // 8. Check the overlap checkbox is visible
    const overlapCheckbox = page.getByText('Automatically adjust overlapping phases');
    await expect(overlapCheckbox).toBeVisible();
    
    // 9. Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('create duplicate phase at beginning', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Open Add Phase modal
    await page.getByRole('button', { name: /add phase/i }).click();
    
    // Select duplicate option
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // Select a source phase
    await page.locator('select[name="source_phase"]').selectOption({ index: 1 });
    
    // Select "at project beginning"
    await page.locator('.selection-card-inline').filter({ hasText: 'At project beginning' }).click();
    
    // Fill custom name
    await page.locator('input[name="custom_name"]').fill('Test Phase Beginning');
    
    // Submit
    await page.getByRole('button', { name: /create phase/i }).click();
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Verify the new phase appears
    await expect(page.getByText('Test Phase Beginning')).toBeVisible({ timeout: 10000 });
  });

  test('handle custom dates', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Open Add Phase modal
    await page.getByRole('button', { name: /add phase/i }).click();
    
    // Select duplicate option
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // Select a source phase
    await page.locator('select[name="source_phase"]').selectOption({ index: 1 });
    
    // Select custom dates
    await page.locator('.selection-card-inline').filter({ hasText: 'Custom dates' }).click();
    
    // Date fields should appear
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    
    // Fill dates
    await page.locator('input[name="start_date"]').fill('2024-12-01');
    await page.locator('input[name="end_date"]').fill('2024-12-31');
    
    // Cancel to avoid creating phase
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('overlap adjustment checkbox toggle', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Open Add Phase modal
    await page.getByRole('button', { name: /add phase/i }).click();
    
    // Select duplicate option
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // Select a source phase
    await page.locator('select[name="source_phase"]').selectOption({ index: 1 });
    
    // Find checkbox
    const checkbox = page.locator('input[name="adjust_overlaps"]');
    
    // Should be checked by default
    await expect(checkbox).toBeChecked();
    
    // Uncheck it
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    
    // Check it again
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    
    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});