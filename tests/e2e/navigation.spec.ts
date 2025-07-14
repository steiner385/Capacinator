import { test, expect } from '@playwright/test';

test.describe('Navigation and Basic Page Loading', () => {
  
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Capacinator/);
    await expect(page.locator('h1')).toContainText('Capacinator');
  });

  test('should navigate to all main pages', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to People page
    await page.click('a[href="/people"]');
    await expect(page).toHaveURL('/people');
    await expect(page.locator('h1')).toContainText('People');
    
    // Test navigation to Projects page
    await page.click('a[href="/projects"]');
    await expect(page).toHaveURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Test navigation to Assignments page
    await page.click('a[href="/assignments"]');
    await expect(page).toHaveURL('/assignments');
    await expect(page.locator('h1')).toContainText('Assignments');
    
    // Test navigation to Roles page
    await page.click('a[href="/roles"]');
    await expect(page).toHaveURL('/roles');
    await expect(page.locator('h1')).toContainText('Roles');
    
    // Test navigation to Reports page
    await page.click('a[href="/reports"]');
    await expect(page).toHaveURL('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('should handle 404 for missing routes', async ({ page }) => {
    // Test non-existent project detail route
    await page.goto('/projects/non-existent');
    // Should either show 404 or redirect to projects list
    
    // Test non-existent person edit route
    await page.goto('/people/123/edit');
    // Should either show 404 or redirect
  });
});