import { test, expect } from '@playwright/test';

test.describe('Scenario View Basic Tests', () => {
  test('should load scenarios page and display view modes', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page loads and contains expected elements
    await expect(page.locator('.scenarios-page')).toBeVisible();
    
    // Check view mode toggle buttons exist
    await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Graphical' })).toBeVisible();
    
    // Cards should be active by default
    await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
  });

  test('should switch between view modes', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Switch to List view
    await page.getByRole('button', { name: 'List' }).click();
    await expect(page.getByRole('button', { name: 'List' })).toHaveClass(/btn-primary/);
    
    // Switch to Graphical view
    await page.getByRole('button', { name: 'Graphical' }).click();
    await expect(page.getByRole('button', { name: 'Graphical' })).toHaveClass(/btn-primary/);
    
    // Switch back to Cards view
    await page.getByRole('button', { name: 'Cards' }).click();
    await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
  });

  test('should display scenario content or loading state', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Should show either loading state or content
    const hasLoading = await page.locator('.page-loading').isVisible();
    const hasContent = await page.locator('.scenarios-content').isVisible();
    
    expect(hasLoading || hasContent).toBeTruthy();
  });
});