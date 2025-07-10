import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Navigation and Hyperlinks', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/');
    await helpers.waitForReactApp();
  });

  test.describe('Main Navigation', () => {
    test('should have all main navigation links', async ({ page }) => {
      const navLinks = [
        { text: 'Dashboard', url: '/' },
        { text: 'Projects', url: '/projects' },
        { text: 'People', url: '/people' },
        { text: 'Assignments', url: '/assignments' },
        { text: 'Roles', url: '/roles' },
        { text: 'Import', url: '/import' }
      ];

      for (const link of navLinks) {
        const navLink = page.locator(`nav a:has-text("${link.text}")`);
        await expect(navLink).toBeVisible();
        
        // Click and verify navigation
        await navLink.click();
        await helpers.waitForNavigation();
        expect(page.url()).toContain(link.url);
      }
    });

    test('should highlight active navigation item', async ({ page }) => {
      // Navigate to projects
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      
      // Check if Projects nav item is highlighted
      const activeLink = page.locator('nav a:has-text("Projects")');
      const className = await activeLink.getAttribute('class');
      expect(className).toMatch(/active|current|selected/);
    });

    test('should have working logo/home link', async ({ page }) => {
      // Navigate away from home
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      
      // Click logo or brand
      const logo = page.locator('nav a:first-child, .navbar-brand, .logo, header a:has(img)').first();
      if (await logo.isVisible()) {
        await logo.click();
        await helpers.waitForNavigation();
        expect(page.url()).toMatch(/\/$/); // Should be at root
      }
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should show breadcrumbs on detail pages', async ({ page }) => {
      // Navigate to project detail
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Click first project
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Check for breadcrumbs
      const breadcrumbs = page.locator('nav[aria-label="breadcrumb"], .breadcrumb, .breadcrumbs');
      if (await breadcrumbs.isVisible()) {
        // Should have "Projects" link in breadcrumbs
        const projectsLink = breadcrumbs.locator('a:has-text("Projects")');
        await expect(projectsLink).toBeVisible();
        
        // Click to go back to projects list
        await projectsLink.click();
        await helpers.waitForNavigation();
        expect(page.url()).toContain('/projects');
      }
    });
  });

  test.describe('Cross-Page Links', () => {
    test('should link from project to team members', async ({ page }) => {
      // Go to project detail
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Find team members section
      const teamSection = page.locator('text=/Team Members|Assigned People|Resources/i');
      if (await teamSection.isVisible()) {
        // Click on a person link
        const personLink = page.locator('a[href*="/people/"]').first();
        if (await personLink.isVisible()) {
          const personName = await personLink.textContent();
          await personLink.click();
          await helpers.waitForNavigation();
          
          // Should be on person detail page
          expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
          await expect(page.locator(`h1:has-text("${personName}")`)).toBeVisible();
        }
      }
    });

    test('should link from person to assigned projects', async ({ page }) => {
      // Go to person detail
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Find projects section
      const projectsSection = page.locator('text=/Current Projects|Assignments|Allocated To/i');
      if (await projectsSection.isVisible()) {
        // Click on a project link
        const projectLink = page.locator('a[href*="/projects/"]').first();
        if (await projectLink.isVisible()) {
          const projectName = await projectLink.textContent();
          await projectLink.click();
          await helpers.waitForNavigation();
          
          // Should be on project detail page
          expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+$/);
          await expect(page.locator(`h1:has-text("${projectName}")`)).toBeVisible();
        }
      }
    });

    test('should link from assignment to both project and person', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      await helpers.waitForDataLoad();
      
      // Test project link
      const projectLink = page.locator('tbody tr td:nth-child(1) a').first();
      const projectName = await projectLink.textContent();
      await projectLink.click();
      await helpers.waitForNavigation();
      
      expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${projectName}")`)).toBeVisible();
      
      // Go back
      await page.goBack();
      await helpers.waitForDataLoad();
      
      // Test person link
      const personLink = page.locator('tbody tr td:nth-child(2) a').first();
      const personName = await personLink.textContent();
      await personLink.click();
      await helpers.waitForNavigation();
      
      expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${personName}")`)).toBeVisible();
    });
  });

  test.describe('Action Links', () => {
    test('should have edit links on detail pages', async ({ page }) => {
      // Go to project detail
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Check for edit button/link
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
      await expect(editButton).toBeVisible();
      
      // Click edit
      await editButton.click();
      
      // Should show form or switch to edit mode
      await expect(page.locator('input[name="name"], form')).toBeVisible();
    });

    test('should have delete confirmation', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Find delete button
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();
      if (await deleteButton.isVisible()) {
        // Set up dialog handler
        page.on('dialog', dialog => {
          expect(dialog.type()).toBe('confirm');
          expect(dialog.message()).toMatch(/delete|remove|confirm/i);
          dialog.dismiss(); // Cancel deletion
        });
        
        await deleteButton.click();
      }
    });

    test('should have "View All" links on dashboard', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Dashboard")', '/');
      
      // Look for "View All" or similar links
      const viewAllLinks = page.locator('a:has-text("View All"), a:has-text("See All"), a:has-text("More")');
      const count = await viewAllLinks.count();
      
      if (count > 0) {
        // Test first "View All" link
        const firstLink = viewAllLinks.first();
        await firstLink.click();
        await helpers.waitForNavigation();
        
        // Should navigate to a list page
        expect(page.url()).toMatch(/\/(projects|people|assignments|roles)/);
      }
    });
  });

  test.describe('External Links', () => {
    test('should open documentation links in new tab', async ({ page, context }) => {
      // Look for help or documentation links
      const helpLink = page.locator('a:has-text("Help"), a:has-text("Documentation"), a:has-text("Docs")');
      
      if (await helpLink.isVisible()) {
        // Check if it has target="_blank"
        const target = await helpLink.getAttribute('target');
        expect(target).toBe('_blank');
        
        // Check if it has rel="noopener"
        const rel = await helpLink.getAttribute('rel');
        expect(rel).toContain('noopener');
      }
    });

    test('should have proper email links', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Look for email links
      const emailLinks = page.locator('a[href^="mailto:"]');
      if (await emailLinks.first().isVisible()) {
        const href = await emailLinks.first().getAttribute('href');
        expect(href).toMatch(/^mailto:[^@]+@[^@]+\.[^@]+$/);
      }
    });
  });

  test.describe('Pagination Links', () => {
    test('should have working pagination', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Look for pagination
      const pagination = page.locator('.pagination, nav[aria-label="pagination"], .page-links');
      if (await pagination.isVisible()) {
        // Check for next button
        const nextButton = pagination.locator('a:has-text("Next"), button:has-text("Next"), a[aria-label="Next"]');
        if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
          await nextButton.click();
          await helpers.waitForDataLoad();
          
          // URL should update with page parameter
          expect(page.url()).toMatch(/page=2|p=2|offset=/);
        }
        
        // Check for page numbers
        const pageNumbers = pagination.locator('a[href*="page"], button:has-text(/^\\d+$/)');
        if (await pageNumbers.first().isVisible()) {
          await pageNumbers.first().click();
          await helpers.waitForDataLoad();
        }
      }
    });
  });

  test.describe('Quick Actions', () => {
    test('should have quick action menus', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Look for action menus (three dots, gear icon, etc.)
      const actionMenu = page.locator('button[aria-label*="actions"], button:has-text("⋮"), button.dropdown-toggle').first();
      if (await actionMenu.isVisible()) {
        await actionMenu.click();
        
        // Check for menu items
        await expect(page.locator('a:has-text("Edit"), a:has-text("Delete"), a:has-text("View")')).toBeVisible();
      }
    });

    test('should have keyboard shortcuts', async ({ page }) => {
      // Press ? or h for help
      await page.keyboard.press('?');
      
      // Check if help modal appears
      const helpModal = page.locator('.modal:has-text("Keyboard Shortcuts"), .help-modal');
      if (await helpModal.isVisible({ timeout: 2000 })) {
        await expect(helpModal.locator('text=/Ctrl|Cmd|Alt/')).toBeVisible();
        
        // Close modal
        await page.keyboard.press('Escape');
        await expect(helpModal).not.toBeVisible();
      }
    });
  });

  test.describe('Error Page Links', () => {
    test('should have link back to home on 404', async ({ page }) => {
      // Navigate to non-existent page
      await page.goto(`${page.url()}non-existent-page-12345`);
      
      // Look for home link
      const homeLink = page.locator('a:has-text("Home"), a:has-text("Dashboard"), a:has-text("Go Back")');
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await helpers.waitForNavigation();
        
        // Should be back at home
        expect(page.url()).toMatch(/\/$/);
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should have working mobile menu', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Look for hamburger menu
      const hamburger = page.locator('button[aria-label*="menu"], button.navbar-toggler, button:has(.hamburger)');
      if (await hamburger.isVisible()) {
        await hamburger.click();
        
        // Mobile menu should be visible
        await expect(page.locator('nav a:has-text("Projects")')).toBeVisible();
        
        // Click a link
        await page.locator('nav a:has-text("Projects")').click();
        await helpers.waitForNavigation();
        
        // Menu should close and navigate
        expect(page.url()).toContain('/projects');
      }
    });
  });

  test.describe('Accessibility Links', () => {
    test('should have skip to content link', async ({ page }) => {
      // Tab to reveal skip link
      await page.keyboard.press('Tab');
      
      const skipLink = page.locator('a:has-text("Skip to content"), a:has-text("Skip to main")');
      if (await skipLink.isVisible()) {
        await skipLink.click();
        
        // Should focus main content
        const main = page.locator('main, [role="main"], #main-content');
        await expect(main).toBeFocused();
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check navigation
      const nav = page.locator('nav[aria-label], [role="navigation"]');
      await expect(nav.first()).toHaveAttribute('aria-label', /.+/);
      
      // Check main content
      const main = page.locator('main, [role="main"]');
      if (await main.isVisible()) {
        const role = await main.getAttribute('role');
        if (role) {
          expect(role).toBe('main');
        }
      }
    });
  });
});