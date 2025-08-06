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
    
    // 1. Check duplicate button is disabled
    const duplicateButton = page.getByRole('button', { name: /duplicate phase/i });
    await expect(duplicateButton).toBeDisabled();
    
    // 2. Select a phase using radio button
    await page.locator('input[type="radio"]').first().click();
    
    // 3. Button should be enabled
    await expect(duplicateButton).toBeEnabled();
    
    // 4. Click duplicate button
    await duplicateButton.click();
    
    // 5. Modal should open (check for modal content)
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.getByText('Duplicating:')).toBeVisible();
    
    // 6. Check placement options exist
    await expect(page.getByText('Placement')).toBeVisible();
    
    // 7. Check the overlap checkbox is checked
    const overlapCheckbox = page.getByText('Automatically adjust overlapping phases');
    await expect(overlapCheckbox).toBeVisible();
    
    // 8. Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('create duplicate phase at beginning', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Select first phase
    await page.locator('input[type="radio"]').first().click();
    
    // Open modal
    await page.getByRole('button', { name: /duplicate phase/i }).click();
    
    // Select "at beginning" placement
    await page.getByText('At project beginning').click();
    
    // Fill custom name
    await page.locator('input[name="custom_name"]').fill('Test Phase Beginning');
    
    // Submit
    await page.getByRole('button', { name: /duplicate phase/i }).last().click();
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Verify the new phase appears
    await expect(page.getByText('Test Phase Beginning')).toBeVisible({ timeout: 10000 });
  });

  test('handle custom dates', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Select phase
    await page.locator('input[type="radio"]').first().click();
    
    // Open modal
    await page.getByRole('button', { name: /duplicate phase/i }).click();
    
    // Select custom dates
    await page.getByText('Custom dates').click();
    
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
    
    // Select phase
    await page.locator('input[type="radio"]').first().click();
    
    // Open modal
    await page.getByRole('button', { name: /duplicate phase/i }).click();
    
    // Find checkbox
    const checkbox = page.locator('input[type="checkbox"]');
    
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