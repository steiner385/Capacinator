/**
 * E2E tests for consolidated Add Phase functionality
 * Tests: creating blank custom phases, duplicating standard phases, duplicating custom phases
 */

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

test.describe('Consolidated Add Phase Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should create a blank custom phase', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Click Add Phase button
    const addPhaseButton = page.getByRole('button', { name: /add phase/i });
    await expect(addPhaseButton).toBeEnabled();
    await addPhaseButton.click();
    
    // Modal should appear with phase type selection
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.getByText('What type of phase would you like to add?')).toBeVisible();
    
    // Select blank custom phase option
    await page.locator('.selection-card').filter({ hasText: 'Blank Custom Phase' }).click();
    
    // Form fields should be visible
    await expect(page.locator('input[name="phase_name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    
    // Fill out the form
    await page.locator('input[name="phase_name"]').fill('Client Review Phase');
    await page.locator('textarea[name="description"]').fill('Phase for client feedback and review');
    await page.locator('input[name="start_date"]').fill('2024-12-15');
    await page.locator('input[name="end_date"]').fill('2024-12-30');
    
    // Submit the form
    await page.getByRole('button', { name: /create phase/i }).click();
    
    // Wait for modal to close
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });
    
    // Verify the new phase appears in the table
    await expect(page.getByText('Client Review Phase')).toBeVisible({ timeout: 10000 });
  });

  test('should duplicate a standard phase', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Click Add Phase button
    const addPhaseButton = page.getByRole('button', { name: /add phase/i });
    await addPhaseButton.click();
    
    // Select duplicate existing phase option
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // Source phase dropdown should be visible
    await expect(page.locator('select[name="source_phase"]')).toBeVisible();
    
    // Select a standard phase (should have is_custom_phase: 0)
    const sourceSelect = page.locator('select[name="source_phase"]');
    const options = await sourceSelect.locator('option').all();
    
    // Find a standard phase option (skip the first "Select a phase" option)
    if (options.length > 1) {
      await sourceSelect.selectOption({ index: 1 });
    }
    
    // Verify placement options are visible
    await expect(page.getByText('Placement')).toBeVisible();
    
    // Select "After" placement (should be default)
    const afterOption = page.locator('.selection-card-inline').filter({ hasText: 'After' });
    await expect(afterOption).toHaveAttribute('data-selected', 'true');
    
    // Verify name field has placeholder with (Copy)
    const nameInput = page.locator('input[name="custom_name"]');
    await expect(nameInput).toBeVisible();
    const placeholder = await nameInput.getAttribute('placeholder');
    expect(placeholder).toContain('(Copy)');
    
    // Fill custom name
    await nameInput.fill('Standard Phase Duplicate');
    
    // Verify overlap adjustment checkbox is checked
    const overlapCheckbox = page.locator('input[name="adjust_overlaps"]');
    await expect(overlapCheckbox).toBeChecked();
    
    // Submit the form
    await page.getByRole('button', { name: /create phase/i }).click();
    
    // Wait for modal to close
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });
    
    // Verify the new phase appears
    await expect(page.getByText('Standard Phase Duplicate')).toBeVisible({ timeout: 10000 });
  });

  test('should duplicate a custom phase', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // First, create a custom phase to duplicate
    const addPhaseButton = page.getByRole('button', { name: /add phase/i });
    await addPhaseButton.click();
    
    // Create a custom phase
    await page.locator('.selection-card').filter({ hasText: 'Blank Custom Phase' }).click();
    await page.locator('input[name="phase_name"]').fill('Original Custom Phase');
    await page.locator('textarea[name="description"]').fill('This is the original custom phase');
    await page.locator('input[name="start_date"]').fill('2024-11-01');
    await page.locator('input[name="end_date"]').fill('2024-11-15');
    await page.getByRole('button', { name: /create phase/i }).click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });
    
    // Now duplicate the custom phase
    await addPhaseButton.click();
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // Select the custom phase we just created
    const sourceSelect = page.locator('select[name="source_phase"]');
    await sourceSelect.selectOption({ label: 'Original Custom Phase' });
    
    // Select custom dates placement
    await page.locator('.selection-card-inline').filter({ hasText: 'Custom dates' }).click();
    
    // Date fields should appear
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    
    // Fill custom dates
    await page.locator('input[name="start_date"]').fill('2024-11-20');
    await page.locator('input[name="end_date"]').fill('2024-11-30');
    
    // Fill custom name
    await page.locator('input[name="custom_name"]').fill('Duplicated Custom Phase');
    
    // Uncheck overlap adjustment
    const overlapCheckbox = page.locator('input[name="adjust_overlaps"]');
    await overlapCheckbox.uncheck();
    await expect(overlapCheckbox).not.toBeChecked();
    
    // Submit
    await page.getByRole('button', { name: /create phase/i }).click();
    
    // Wait for modal to close
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });
    
    // Verify both phases appear
    await expect(page.getByText('Original Custom Phase')).toBeVisible();
    await expect(page.getByText('Duplicated Custom Phase')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Click Add Phase button
    const addPhaseButton = page.getByRole('button', { name: /add phase/i });
    await addPhaseButton.click();
    
    // Select blank custom phase
    await page.locator('.selection-card').filter({ hasText: 'Blank Custom Phase' }).click();
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: /create phase/i }).click();
    
    // Should see validation errors
    await expect(page.getByText('Phase name is required')).toBeVisible();
    
    // Fill only phase name
    await page.locator('input[name="phase_name"]').fill('Test Phase');
    
    // Try to submit with invalid dates
    await page.locator('input[name="start_date"]').fill('2024-12-30');
    await page.locator('input[name="end_date"]').fill('2024-12-01');
    await page.getByRole('button', { name: /create phase/i }).click();
    
    // Should see date validation error
    await expect(page.getByText('End date must be after start date')).toBeVisible();
  });

  test('should handle phase type switching', async ({ page }) => {
    await navigateToProjectDetail(page);
    
    // Click Add Phase button
    const addPhaseButton = page.getByRole('button', { name: /add phase/i });
    await addPhaseButton.click();
    
    // Start with duplicate phase
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    await expect(page.locator('select[name="source_phase"]')).toBeVisible();
    
    // Switch to blank custom phase
    await page.locator('.selection-card').filter({ hasText: 'Blank Custom Phase' }).click();
    await expect(page.locator('select[name="source_phase"]')).not.toBeVisible();
    await expect(page.locator('input[name="phase_name"]')).toBeVisible();
    
    // Switch back to duplicate
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    await expect(page.locator('select[name="source_phase"]')).toBeVisible();
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });
});