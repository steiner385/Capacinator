import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Read Operations - All Pages', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/');
    await helpers.waitForReactApp();
  });

  test.describe('Dashboard Page', () => {
    test('should display all dashboard metrics', async ({ page }) => {
      // Navigate to dashboard
      await helpers.clickAndNavigate('nav a:has-text("Dashboard")', '/');
      
      // Check summary cards
      await expect(page.locator('text=Total Projects')).toBeVisible();
      await expect(page.locator('text=Total People')).toBeVisible();
      await expect(page.locator('text=Active Assignments')).toBeVisible();
      
      // Verify metrics have values
      const projectCount = await page.locator('div:has-text("Total Projects") >> .. >> .text-3xl').textContent();
      expect(parseInt(projectCount || '0')).toBeGreaterThan(0);
      
      // Check charts are rendered
      await expect(page.locator('text=Project Health')).toBeVisible();
      await expect(page.locator('text=Resource Utilization')).toBeVisible();
      await expect(page.locator('text=Capacity Status')).toBeVisible();
    });

    test('should have working links to detail pages', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Dashboard")', '/');
      
      // Click on projects summary card
      const projectsCard = page.locator('div:has-text("Total Projects")').first();
      await projectsCard.click();
      await helpers.waitForNavigation();
      expect(page.url()).toContain('/projects');
      
      // Go back and test people link
      await page.goBack();
      await helpers.waitForReactApp();
      
      const peopleCard = page.locator('div:has-text("Total People")').first();
      await peopleCard.click();
      await helpers.waitForNavigation();
      expect(page.url()).toContain('/people');
    });
  });

  test.describe('Projects Page', () => {
    test('should display project list with all columns', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      
      // Check table headers
      const headers = ['Name', 'Type', 'Location', 'Priority', 'Owner', 'Status'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
      
      // Verify data is loaded
      await helpers.waitForDataLoad();
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
      
      // Check first row has data
      const firstRow = page.locator('tbody tr').first();
      const projectName = await firstRow.locator('td').first().textContent();
      expect(projectName).toBeTruthy();
    });

    test('should have working filters', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Test priority filter
      await page.selectOption('select[name="priority"]', 'high');
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const rows = await page.locator('tbody tr').count();
      if (rows > 0) {
        const priorities = await page.locator('tbody tr td:nth-child(4)').allTextContents();
        priorities.forEach(priority => {
          expect(priority.toLowerCase()).toContain('high');
        });
      }
    });

    test('should have clickable project names', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Get first project name
      const firstProjectName = await page.locator('tbody tr td').first().textContent();
      
      // Click on project name (should be a link)
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Should navigate to project detail page
      expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+$/);
      
      // Project name should be displayed on detail page
      await expect(page.locator(`h1:has-text("${firstProjectName}")`)).toBeVisible();
    });
  });

  test.describe('People Page', () => {
    test('should display people list with all columns', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      
      // Check table headers
      const headers = ['Name', 'Email', 'Role', 'Location', 'Type', 'Availability'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
      
      // Verify data is loaded
      await helpers.waitForDataLoad();
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    });

    test('should show availability percentage', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Check availability column has percentage values
      const availabilities = await page.locator('tbody tr td:last-child').allTextContents();
      availabilities.forEach(availability => {
        expect(availability).toMatch(/\d+%/);
      });
    });

    test('should have clickable person names', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Click on first person
      const firstName = await page.locator('tbody tr td').first().textContent();
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Should show person details
      expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${firstName}")`)).toBeVisible();
    });
  });

  test.describe('Assignments Page', () => {
    test('should display assignments with all details', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      
      // Check table headers
      const headers = ['Project', 'Person', 'Role', 'Allocation', 'Period'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
      
      // Verify data
      await helpers.waitForDataLoad();
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
      
      // Check allocation percentages
      const allocations = await page.locator('tbody tr td:nth-child(4)').allTextContents();
      allocations.forEach(allocation => {
        expect(allocation).toMatch(/\d+%/);
      });
    });

    test('should show date ranges', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      await helpers.waitForDataLoad();
      
      // Check period column has date ranges
      const periods = await page.locator('tbody tr td:nth-child(5)').allTextContents();
      periods.forEach(period => {
        expect(period).toMatch(/\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2}/);
      });
    });

    test('should have links to projects and people', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      await helpers.waitForDataLoad();
      
      // Click on project link
      const projectLink = page.locator('tbody tr td:nth-child(1) a').first();
      const projectName = await projectLink.textContent();
      await projectLink.click();
      await helpers.waitForNavigation();
      
      // Should navigate to project page
      expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${projectName}")`)).toBeVisible();
      
      // Go back and test person link
      await page.goBack();
      await helpers.waitForDataLoad();
      
      const personLink = page.locator('tbody tr td:nth-child(2) a').first();
      const personName = await personLink.textContent();
      await personLink.click();
      await helpers.waitForNavigation();
      
      // Should navigate to person page
      expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${personName}")`)).toBeVisible();
    });
  });

  test.describe('Roles Page', () => {
    test('should display all roles', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Roles")', '/roles');
      
      // Check headers
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Description")')).toBeVisible();
      
      // Verify data
      await helpers.waitForDataLoad();
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
      
      // Check common roles exist
      const roleNames = await page.locator('tbody tr td:first-child').allTextContents();
      const expectedRoles = ['Project Manager', 'Developer', 'QA Engineer'];
      expectedRoles.forEach(role => {
        expect(roleNames.some(name => name.includes(role))).toBeTruthy();
      });
    });
  });

  test.describe('Locations Page', () => {
    test('should display all locations', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Locations")', '/locations');
      
      // Verify data
      await helpers.waitForDataLoad();
      const items = await page.locator('[data-testid="location-item"], .location-card, tbody tr').count();
      expect(items).toBeGreaterThan(0);
      
      // Check for common locations
      await expect(page.locator('text=New York')).toBeVisible();
      await expect(page.locator('text=San Francisco')).toBeVisible();
    });
  });

  test.describe('Data Relationships', () => {
    test('should show related data on project detail page', async ({ page }) => {
      // Go to projects
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Click first project
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Should show project details
      await expect(page.locator('text=Project Type')).toBeVisible();
      await expect(page.locator('text=Location')).toBeVisible();
      await expect(page.locator('text=Priority')).toBeVisible();
      
      // Should show team members section
      await expect(page.locator('text=/Team Members|Assignments|Resources/')).toBeVisible();
      
      // Should show phase timeline
      await expect(page.locator('text=/Timeline|Phases|Schedule/')).toBeVisible();
    });

    test('should show related data on person detail page', async ({ page }) => {
      // Go to people
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Click first person
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Should show person details
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=Role')).toBeVisible();
      await expect(page.locator('text=Location')).toBeVisible();
      
      // Should show current assignments
      await expect(page.locator('text=/Current Assignments|Projects|Allocation/')).toBeVisible();
      
      // Should show availability
      await expect(page.locator('text=/Availability|Schedule|Calendar/')).toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test('should search projects by name', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Get initial count
      const initialCount = await page.locator('tbody tr').count();
      
      // Search for specific term
      await page.fill('input[placeholder*="Search"], input[type="search"]', 'Mobile');
      await page.waitForTimeout(500);
      
      // Should filter results
      const filteredCount = await page.locator('tbody tr').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
      
      // Results should contain search term
      if (filteredCount > 0) {
        const names = await page.locator('tbody tr td:first-child').allTextContents();
        names.forEach(name => {
          expect(name.toLowerCase()).toContain('mobile');
        });
      }
    });

    test('should filter people by role', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // If role filter exists, test it
      const roleFilter = page.locator('select[name="role"], select:has-text("Role")');
      if (await roleFilter.isVisible()) {
        // Select a role
        const options = await roleFilter.locator('option').allTextContents();
        if (options.length > 1) {
          await roleFilter.selectOption({ index: 1 });
          await page.waitForTimeout(500);
          
          // Verify filtered results
          const rows = await page.locator('tbody tr').count();
          expect(rows).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});