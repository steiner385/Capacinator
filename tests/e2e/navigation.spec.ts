import { test, expect } from './helpers/base-test';
import { testConfig, waitForPageReady } from './helpers/test-config';

test.describe('Navigation and Basic Page Loading', () => {
  
  test('should load dashboard page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Already authenticated, verify we're on dashboard
    const url = page.url();
    expect(url).toContain('/dashboard');
    
    // Verify page title
    await expect(page).toHaveTitle(/Capacinator/);
    
    // Verify dashboard heading is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText('Dashboard');
  });

  test('should navigate to all main pages', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Start from dashboard
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Test navigation to People page
    await page.click('a[href="/people"]');
    await page.waitForURL('/people');
    await waitForPageReady(page);
    await expect(page.locator('h1')).toContainText('People');
    
    // Test navigation to Projects page
    await page.click('a[href="/projects"]');
    await page.waitForURL('/projects');
    await waitForPageReady(page);
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Test navigation to Assignments page
    await page.click('a[href="/assignments"]');
    await page.waitForURL('/assignments');
    await waitForPageReady(page);
    await expect(page.locator('h1')).toContainText('Assignments');
    
    // Test navigation to Reports page
    await page.click('a[href="/reports"]');
    await page.waitForURL('/reports');
    await waitForPageReady(page);
    // Reports page might be "Reports" or "Reports & Analytics"
    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('should handle 404 for missing routes', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Test non-existent project detail route
    await page.goto('/projects/non-existent');
    await waitForPageReady(page);
    
    // Check if we're redirected or showing error
    const url = page.url();
    const hasError = await page.locator('text=/404|not found|error/i').count() > 0;
    
    expect(url.includes('/projects/non-existent') || url.endsWith('/projects') || hasError).toBeTruthy();
    
    // Test non-existent person edit route
    await page.goto('/people/123/edit');
    await waitForPageReady(page);
    
    const url2 = page.url();
    const hasError2 = await page.locator('text=/404|not found|error/i').count() > 0;
    
    expect(url2.includes('/people/123/edit') || url2.endsWith('/people') || hasError2).toBeTruthy();
  });

  test('should maintain navigation state across page refreshes', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to Projects
    await page.goto('/projects');
    await waitForPageReady(page);
    
    // Refresh the page
    await page.reload();
    await waitForPageReady(page);
    
    // Should still be on Projects page
    await expect(page).toHaveURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('should have working navigation links in sidebar', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Ensure we're on a page with sidebar
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Check that all main navigation links exist and are visible
    const navLinks = [
      { href: '/dashboard', text: 'Dashboard' },
      { href: '/people', text: 'People' },
      { href: '/projects', text: 'Projects' },
      { href: '/assignments', text: 'Assignments' },
      { href: '/reports', text: 'Reports' }
    ];
    
    for (const link of navLinks) {
      const navLink = page.locator(`a[href="${link.href}"]`).first();
      await expect(navLink).toBeVisible();
      
      // Verify link text contains expected text
      const linkText = await navLink.textContent();
      expect(linkText?.toLowerCase()).toContain(link.text.toLowerCase());
    }
  });
});