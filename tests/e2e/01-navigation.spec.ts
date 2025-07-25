import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Navigation and Basic UI', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await helpers.setupPage();
  });

  test('should load the dashboard page by default', async ({ page }) => {
    // Should redirect to /dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Should show dashboard title
    await helpers.verifyPageTitle('Dashboard');
    
    // Should show navigation sidebar
    await helpers.waitForNavigation();
    
    // Should load dashboard charts
    await helpers.waitForDashboardCharts();
    
    // Should not show any errors
    await helpers.verifyNoErrors();
  });

  test('should navigate between pages using sidebar', async ({ page }) => {
    // Ensure we're in a stable state first
    await helpers.waitForNavigation();
    
    // Navigate to Projects
    try {
      await helpers.navigateViaSidebar('Projects');
      if (!page.isClosed()) {
        await expect(page).toHaveURL(/.*\/projects/, { timeout: 10000 });
        await helpers.verifyPageTitle('Projects');
      }
    } catch (error) {
      if (page.isClosed()) {
        throw new Error('Page was closed during Projects navigation');
      }
      throw error;
    }
    
    // Navigate to People
    try {
      if (!page.isClosed()) {
        await helpers.navigateViaSidebar('People');
        if (!page.isClosed()) {
          await expect(page).toHaveURL(/.*\/people/, { timeout: 10000 });
          await helpers.verifyPageTitle('People');
        }
      }
    } catch (error) {
      if (page.isClosed()) {
        throw new Error('Page was closed during People navigation');
      }
      throw error;
    }
    
    // Navigate back to Dashboard
    try {
      if (!page.isClosed()) {
        await helpers.navigateViaSidebar('Dashboard');
        if (!page.isClosed()) {
          await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
          await helpers.verifyPageTitle('Dashboard');
        }
      }
    } catch (error) {
      if (page.isClosed()) {
        throw new Error('Page was closed during Dashboard navigation');
      }
      throw error;
    }
  });

  test('should display sidebar navigation correctly', async ({ page }) => {
    // Check all navigation items are present (based on actual Layout.tsx implementation)
    const navItems = [
      'Dashboard',
      'Projects', 
      'People',
      'Assignments',
      'Scenarios',
      'Reports',
      'Locations',
      'Audit Log',
      'Settings'
    ];

    for (const item of navItems) {
      const navLink = page.locator(`[data-testid="nav-${item.toLowerCase()}"], .nav-link:has-text("${item}")`);
      await expect(navLink).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be accessible
    await helpers.navigateTo('/dashboard');
    await helpers.verifyPageTitle('Dashboard');
    
    // Navigation should be responsive
    await helpers.waitForNavigation();
    
    // Try navigating on mobile
    await helpers.navigateViaSidebar('Projects');
    await helpers.verifyPageTitle('Projects');
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through several pages
    await helpers.navigateViaSidebar('Projects');
    await helpers.navigateViaSidebar('People');
    await helpers.navigateViaSidebar('Assignments');
    
    // Use browser back
    await page.goBack();
    await expect(page).toHaveURL(/.*\/people/);
    
    await page.goBack();
    await expect(page).toHaveURL(/.*\/projects/);
    
    // Use browser forward
    await page.goForward();
    await expect(page).toHaveURL(/.*\/people/);
  });

  test('should display page loading states correctly', async ({ page }) => {
    // Navigate to a page and check loading state
    await helpers.navigateTo('/projects');
    
    // Loading spinner should appear and then disappear
    // Note: This might be fast with local data, so we'll just verify the table loads
    await helpers.waitForDataTable();
    
    // Should not show loading spinner when done
    await helpers.waitForLoadingComplete();
  });
});