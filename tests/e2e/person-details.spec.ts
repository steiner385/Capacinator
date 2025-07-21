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
      'Workload Insights & Actions',
      'Basic Information',
      'Roles & Skills',
      'Current Assignments',
      'Allocation vs Availability',
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
  
  test('displays workload insights with proper calculations', async ({ page }) => {
    // Navigate to person details
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    const firstRow = page.locator('.table tbody tr').first();
    await firstRow.click();
    
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Check for workload insights section
    const insightsSection = page.locator('.insights-section');
    if (await insightsSection.count() > 0) {
      await expect(insightsSection).toBeVisible();
      
      // Check for insight cards
      const insightCards = page.locator('.insight-card');
      await expect(insightCards.first()).toBeVisible();
      
      // Verify insight values are displayed
      const insightValues = page.locator('.insight-value');
      await expect(insightValues.first()).toBeVisible();
      
      // Check for allocation status
      const statusBadge = page.locator('.insight-status');
      if (await statusBadge.count() > 0) {
        await expect(statusBadge.first()).toBeVisible();
        const statusText = await statusBadge.first().textContent();
        expect(statusText).toMatch(/(OVER_ALLOCATED|FULLY_ALLOCATED|UNDER_ALLOCATED|AVAILABLE)/);
      }
    }
  });
  
  test('displays and handles action buttons based on allocation status', async ({ page }) => {
    // Navigate to person details
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    const firstRow = page.locator('.table tbody tr').first();
    await firstRow.click();
    
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Check for action buttons in insights section
    const actionButtons = page.locator('.action-btn');
    if (await actionButtons.count() > 0) {
      await expect(actionButtons.first()).toBeVisible();
      
      // Test button click navigation
      const firstButton = actionButtons.first();
      const buttonText = await firstButton.textContent();
      
      await firstButton.click();
      await page.waitForTimeout(1000);
      
      // Verify navigation based on button type
      const currentUrl = page.url();
      if (buttonText?.includes('Assign')) {
        expect(currentUrl).toMatch(/\/assignments/);
      } else if (buttonText?.includes('Reduce')) {
        expect(currentUrl).toContain('action=reduce');
      } else if (buttonText?.includes('Monitor')) {
        expect(currentUrl).toMatch(/\/reports/);
        expect(currentUrl).toContain('type=utilization');
      } else if (buttonText?.includes('Find')) {
        expect(currentUrl).toMatch(/\/(people|projects)/);
      }
    }
  });
  
  test('shows proper context for upcoming time off', async ({ page }) => {
    // Navigate to person details
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    const firstRow = page.locator('.table tbody tr').first();
    await firstRow.click();
    
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Check for time off alert in insights
    const timeOffAlert = page.locator('.alert-card');
    if (await timeOffAlert.count() > 0) {
      await expect(timeOffAlert).toBeVisible();
      await expect(timeOffAlert).toContainText('Upcoming Time Off');
      await expect(timeOffAlert).toContainText('Plan coverage needed');
    }
  });
  
  test('displays correct utilization calculations', async ({ page }) => {
    // Navigate to person details
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    const firstRow = page.locator('.table tbody tr').first();
    await firstRow.click();
    
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Check for utilization percentage display
    const utilizationCard = page.locator('.insight-card').nth(1); // Second card is utilization
    if (await utilizationCard.count() > 1) {
      await expect(utilizationCard).toBeVisible();
      
      const utilizationValue = utilizationCard.locator('.insight-value');
      const utilizationText = await utilizationValue.textContent();
      expect(utilizationText).toMatch(/\d+%/);
    }
    
    // Check for availability comparison
    const comparisonText = page.locator('.insight-comparison');
    if (await comparisonText.count() > 0) {
      const availabilityText = await comparisonText.first().textContent();
      expect(availabilityText).toMatch(/vs \d+% available/);
    }
  });
  
  test('handles allocation chart integration', async ({ page }) => {
    // Navigate to person details
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    const firstRow = page.locator('.table tbody tr').first();
    await firstRow.click();
    
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.waitForSelector('.person-details');
    
    // Check for allocation chart section
    const allocationSection = page.locator('h2:has-text("Allocation vs Availability")');
    await expect(allocationSection).toBeVisible();
    
    // Check if chart component is rendered
    const chartContainer = page.locator('.chart-container');
    if (await chartContainer.count() > 0) {
      await expect(chartContainer.first()).toBeVisible();
    }
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