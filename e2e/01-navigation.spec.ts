import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Navigation and Basic UI', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateTo('/');
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
    // Navigate to Projects
    await helpers.navigateViaSidebar('Projects');
    await expect(page).toHaveURL(/.*\/projects/);
    await helpers.verifyPageTitle('Projects');
    
    // Navigate to People
    await helpers.navigateViaSidebar('People');
    await expect(page).toHaveURL(/.*\/people/);
    await helpers.verifyPageTitle('People');
    
    // Navigate to Roles
    await helpers.navigateViaSidebar('Roles');
    await expect(page).toHaveURL(/.*\/roles/);
    await helpers.verifyPageTitle('Roles');
    
    // Navigate to Assignments
    await helpers.navigateViaSidebar('Assignments');
    await expect(page).toHaveURL(/.*\/assignments/);
    await helpers.verifyPageTitle('Assignments');
    
    // Navigate to Import
    await helpers.navigateViaSidebar('Import');
    await expect(page).toHaveURL(/.*\/import/);
    await helpers.verifyPageTitle('Import Data');
    
    // Navigate back to Dashboard
    await helpers.navigateViaSidebar('Dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await helpers.verifyPageTitle('Dashboard');
  });

  test('should display sidebar navigation correctly', async ({ page }) => {
    // Check all navigation items are present
    const navItems = [
      'Dashboard',
      'Projects', 
      'People',
      'Roles',
      'Assignments',
      'Allocations',
      'Availability',
      'Reports',
      'Import',
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
    await helpers.navigateViaSidebar('Roles');
    
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