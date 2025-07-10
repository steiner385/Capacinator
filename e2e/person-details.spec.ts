import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Person Details Page', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/');
  });

  test('can navigate to person details from people list', async ({ page }) => {
    // Navigate to people page
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Click on first person
    const firstPersonName = await page.locator('.person-name .name').first().textContent();
    await page.locator('.person-name .name').first().click();
    
    // Wait for person details page
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Verify person name is displayed
    const headerName = await page.locator('.page-header h1').textContent();
    expect(headerName).toBe(firstPersonName);
  });

  test('displays all person information sections', async ({ page }) => {
    // Navigate directly to a person details page
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Get first person's ID from the table row
    const firstRow = page.locator('.table tbody tr').first();
    await firstRow.click();
    
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Check all sections are present
    const sections = [
      'Basic Information',
      'Roles & Skills',
      'Current Assignments',
      'Availability & Time Off',
      'History'
    ];
    
    for (const section of sections) {
      const sectionHeader = page.locator('.section-header h2', { hasText: section });
      await expect(sectionHeader).toBeVisible();
    }
  });

  test('can expand and collapse sections', async ({ page }) => {
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Navigate to first person
    await page.locator('.table tbody tr').first().click();
    await page.waitForSelector('.person-details');
    
    // Find history section (usually collapsed by default)
    const historySection = page.locator('.detail-section').filter({ has: page.locator('h2:has-text("History")') });
    const historyContent = historySection.locator('.section-content');
    
    // Should be collapsed initially
    await expect(historyContent).not.toBeVisible();
    
    // Click to expand
    await historySection.locator('.section-header').click();
    await expect(historyContent).toBeVisible();
    
    // Click to collapse
    await historySection.locator('.section-header').click();
    await expect(historyContent).not.toBeVisible();
  });

  test('edit button is visible when authorized', async ({ page }) => {
    // Set authorization in localStorage
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
    });
    
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Navigate to first person
    await page.locator('.table tbody tr').first().click();
    await page.waitForSelector('.person-details');
    
    // Edit button should be visible
    const editButton = page.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible();
  });

  test('edit button is hidden for viewers', async ({ page }) => {
    // Set viewer role in localStorage
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'viewer');
    });
    
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Navigate to first person
    await page.locator('.table tbody tr').first().click();
    await page.waitForSelector('.person-details');
    
    // Edit button should not be visible
    const editButton = page.locator('button:has-text("Edit")');
    await expect(editButton).not.toBeVisible();
  });

  test('can enter and exit edit mode', async ({ page }) => {
    // Set authorization
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
    });
    
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Navigate to first person
    await page.locator('.table tbody tr').first().click();
    await page.waitForSelector('.person-details');
    
    // Click edit button
    await page.locator('button:has-text("Edit")').click();
    
    // Should show save and cancel buttons
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    
    // Form inputs should be visible
    await expect(page.locator('.form-input').first()).toBeVisible();
    
    // Click cancel
    await page.locator('button:has-text("Cancel")').click();
    
    // Should return to view mode
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).not.toBeVisible();
  });

  test('links to projects from assignments', async ({ page }) => {
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Navigate to first person
    await page.locator('.table tbody tr').first().click();
    await page.waitForSelector('.person-details');
    
    // Check if there are any assignments
    const assignmentsSection = page.locator('.detail-section').filter({ 
      has: page.locator('h2:has-text("Current Assignments")') 
    });
    
    // Expand if collapsed
    const assignmentContent = assignmentsSection.locator('.section-content');
    if (!(await assignmentContent.isVisible())) {
      await assignmentsSection.locator('.section-header').click();
    }
    
    // If there are assignments, check project links
    const projectLinks = assignmentsSection.locator('.assignment-project');
    const linkCount = await projectLinks.count();
    
    if (linkCount > 0) {
      const firstProjectName = await projectLinks.first().textContent();
      await projectLinks.first().click();
      
      // Should navigate to project details
      await page.waitForURL(/\/projects\/[^/]+$/);
      
      // Verify project name
      const projectHeader = await page.locator('.page-header h1').textContent();
      expect(projectHeader).toContain(firstProjectName);
    }
  });

  test('displays person email and contact info', async ({ page }) => {
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    // Get email from table
    const firstPersonEmail = await page.locator('.person-name .email').first().textContent();
    
    // Navigate to first person
    await page.locator('.table tbody tr').first().click();
    await page.waitForSelector('.person-details');
    
    // Check email is displayed in details
    const emailLink = page.locator('.info-value a[href^="mailto:"]');
    await expect(emailLink).toBeVisible();
    
    const detailEmail = await emailLink.textContent();
    expect(detailEmail).toBe(firstPersonEmail);
  });
});