import { test, expect } from '@playwright/test';
import { TestHelpers , setupPageWithAuth} from './utils/test-helpers';

test.describe('Actionable Insights Workflow', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Navigate to main page
    await setupPageWithAuth(page, '/');
    
    // Handle profile selection using robust helper
    await helpers.handleProfileSelection();
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should complete full workflow from PersonDetails insights to assignment creation', async ({ page }) => {
    // Step 1: Navigate to People page
    await page.click('nav a[href="/people"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('People');

    // Step 2: Check for team insights summary
    await expect(page.locator('.team-insights')).toBeVisible();
    await expect(page.locator('.insight-item')).toHaveCount(3); // over-allocated, available, total

    // Step 3: Look for a person with actionable insights
    const workloadStatusColumns = page.locator('.workload-status');
    await expect(workloadStatusColumns.first()).toBeVisible();

    // Step 4: Find and click on a person's quick action button
    const quickActionButtons = page.locator('.quick-action-btn');
    if (await quickActionButtons.count() > 0) {
      const firstActionButton = quickActionButtons.first();
      const buttonText = await firstActionButton.textContent();
      
      // Click the action button
      await firstActionButton.click();
      
      // Step 5: Verify navigation based on action type
      if (buttonText?.includes('Assign')) {
        // Should navigate to assignment creation
        await page.waitForURL('**/assignments/new?**');
        await expect(page.locator('h1')).toContainText('New Assignment');
        
        // Step 6: Verify context banner and pre-filled form
        await expect(page.locator('.context-banner')).toBeVisible();
        await expect(page.locator('.context-alert')).toContainText('Assignment Context:');
        
        // Check if person is pre-filled
        const personSelect = page.locator('select[name="person_id"]');
        const selectedPersonValue = await personSelect.inputValue();
        expect(selectedPersonValue).not.toBe('');
        
      } else if (buttonText?.includes('Reduce')) {
        // Should navigate to assignments with reduce context
        await page.waitForURL('**/assignments?**action=reduce**');
        await expect(page.locator('h1')).toContainText('Assignments');
        
        // Step 6: Verify context message
        await expect(page.locator('.context-message')).toBeVisible();
        await expect(page.locator('.context-message')).toContainText('reducing workload');
        
      } else if (buttonText?.includes('Monitor')) {
        // Should navigate to reports with utilization context
        await page.waitForURL('**/reports?**type=utilization**');
        await expect(page.locator('h1')).toContainText('Reports');
      }
    }
  });

  test('should show correct workload insights on PersonDetails page', async ({ page }) => {
    // Step 1: Navigate to People page
    await page.click('nav a[href="/people"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 2: Click on a person's name to go to details
    const personLinks = page.locator('table tbody tr td a');
    if (await personLinks.count() > 0) {
      await personLinks.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Step 3: Verify PersonDetails page loads
      await expect(page.locator('h1')).not.toContainText('People'); // Should have person's name
      
      // Step 4: Check for workload insights section
      await expect(page.locator('.insights-section')).toBeVisible();
      await expect(page.locator('h2:has-text("Workload Insights & Actions")')).toBeVisible();
      
      // Step 5: Verify insights cards
      const insightCards = page.locator('.insight-card');
      await expect(insightCards).toHaveCount(3); // Total allocation, utilization, active projects
      
      // Step 6: Check for allocation status display
      const utilizationValue = page.locator('.insight-value').nth(1);
      await expect(utilizationValue).toBeVisible();
      
      // Step 7: Verify action buttons are present
      const actionButtons = page.locator('.action-btn');
      await expect(actionButtons.first()).toBeVisible();
      
      // Step 8: Test action button functionality
      if (await actionButtons.count() > 0) {
        const firstButton = actionButtons.first();
        const buttonText = await firstButton.textContent();
        
        await firstButton.click();
        
        // Verify navigation based on button type
        if (buttonText?.includes('Assign')) {
          await page.waitForURL('**/assignments/new?**');
        } else if (buttonText?.includes('Reduce')) {
          await page.waitForURL('**/assignments?**action=reduce**');
        } else if (buttonText?.includes('Monitor')) {
          await page.waitForURL('**/reports?**type=utilization**');
        }
      }
    }
  });

  test('should handle Reports page actionable insights correctly', async ({ page }) => {
    // Step 1: Navigate to Reports page
    await page.click('nav a[href="/reports"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText('Reports');

    // Step 2: Ensure we're on the capacity report tab
    const capacityTab = page.locator('[data-tab="capacity"]');
    if (await capacityTab.count() > 0) {
      await capacityTab.click();
    }
    
    // Wait for report to load
    await page.waitForSelector('.report-content', { timeout: 10000 });

    // Step 3: Check for actionable buttons in people capacity table
    const peopleTable = page.locator('.table-container:has(h3:text("People Capacity Overview"))');
    await expect(peopleTable).toBeVisible();

    const actionButtons = peopleTable.locator('.action-buttons .btn');
    if (await actionButtons.count() > 0) {
      // Step 4: Test different action types
      const assignButtons = actionButtons.filter({ hasText: 'Assign' });
      const reduceLoadButtons = actionButtons.filter({ hasText: 'Reduce Load' });
      const viewLoadButtons = actionButtons.filter({ hasText: 'View Load' });

      // Test Assign button
      if (await assignButtons.count() > 0) {
        await assignButtons.first().click();
        await page.waitForURL('**/assignments?**action=assign**');
        await expect(page.locator('h1')).toContainText('Assignments');
        await page.goBack();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      }

      // Test Reduce Load button
      if (await reduceLoadButtons.count() > 0) {
        await reduceLoadButtons.first().click();
        await page.waitForURL('**/assignments?**action=reduce**');
        await expect(page.locator('h1')).toContainText('Assignments');
        await page.goBack();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      }
    }

    // Step 5: Check role capacity analysis table
    const roleTable = page.locator('.table-container:has(h3:text("Role Capacity Analysis"))');
    await expect(roleTable).toBeVisible();

    const roleActionButtons = roleTable.locator('.action-buttons .btn');
    if (await roleActionButtons.count() > 0) {
      const viewPeopleButtons = roleActionButtons.filter({ hasText: 'View People' });
      const assignWorkButtons = roleActionButtons.filter({ hasText: 'Assign Work' });
      const hireMoreButtons = roleActionButtons.filter({ hasText: 'Hire More' });

      // Test View People button
      if (await viewPeopleButtons.count() > 0) {
        await viewPeopleButtons.first().click();
        await page.waitForURL('**/people?**role=**');
        await expect(page.locator('h1')).toContainText('People');
        await page.goBack();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      }
    }
  });

  test('should handle contextual form pre-filling in AssignmentNew', async ({ page }) => {
    // Step 1: Navigate directly with query parameters to simulate action button click
    const testParams = '?person=Test Person&action=assign&from=capacity-report&status=AVAILABLE';
    await page.goto(`/assignments/new${testParams}`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 2: Verify page loads correctly
    await expect(page.locator('h1')).toContainText('New Assignment');

    // Step 3: Check for context banner
    await expect(page.locator('.context-banner')).toBeVisible();
    await expect(page.locator('.context-alert')).toContainText('Assignment Context:');

    // Step 4: Check for "From" badge in header
    await expect(page.locator('.badge-info')).toContainText('From capacity-report');

    // Step 5: Verify form pre-filling would work (fields exist)
    await expect(page.locator('select[name="person_id"]')).toBeVisible();
    await expect(page.locator('select[name="role_id"]')).toBeVisible();
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    await expect(page.locator('input[name="allocation_percentage"]')).toBeVisible();

    // Step 6: Test different action contexts
    const reduceParams = '?person=Test Person&action=reduce&from=people-page';
    await page.goto(`/assignments/new${reduceParams}`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.locator('.context-alert')).toContainText('Reducing workload');
  });

  test('should handle Assignments page contextual filtering', async ({ page }) => {
    // Step 1: Navigate with filtering context
    const filterParams = '?person=Test Person&action=view&from=capacity-report';
    await page.goto(`/assignments${filterParams}`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 2: Verify page loads correctly
    await expect(page.locator('h1')).toContainText('Assignments');

    // Step 3: Check for context message
    await expect(page.locator('.context-message')).toBeVisible();

    // Step 4: Verify filters would be applied (filter elements exist)
    await expect(page.locator('.filter-bar')).toBeVisible();

    // Step 5: Test different filtering contexts
    const roleFilterParams = '?role=Developer&action=assign&from=reports';
    await page.goto(`/assignments${roleFilterParams}`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.locator('.context-message')).toContainText('Developer');
  });

  test('should maintain workflow context across page transitions', async ({ page }) => {
    // Step 1: Start from People page
    await page.click('nav a[href="/people"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 2: Click a quick action button (simulate workflow start)
    const quickActionButtons = page.locator('.quick-action-btn');
    if (await quickActionButtons.count() > 0) {
      const firstButton = quickActionButtons.first();
      const buttonText = await firstButton.textContent();
      
      await firstButton.click();
      
      // Step 3: Verify context is preserved in URL
      const currentUrl = page.url();
      expect(currentUrl).toContain('person=');
      expect(currentUrl).toContain('action=');

      // Step 4: If we're on assignment creation, test form behavior
      if (currentUrl.includes('/assignments/new')) {
        await expect(page.locator('.context-banner')).toBeVisible();
        
        // Step 5: Test cancel button maintains context awareness
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
          // Should return to assignments page
          await expect(page.locator('h1')).toContainText('Assignments');
        }
      }
    }
  });

  test('should handle error states gracefully in actionable insights', async ({ page }) => {
    // Step 1: Test with invalid query parameters
    await setupPageWithAuth(page, '/assignments/new?person=NonExistentPerson&action=assign');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Should still show page without crashing
    await expect(page.locator('h1')).toContainText('New Assignment');
    await expect(page.locator('.context-banner')).toBeVisible();

    // Step 2: Test People page without utilization data
    await page.click('nav a[href="/people"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Should still show people table
    await expect(page.locator('h1')).toContainText('People');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should provide accessible actionable insights', async ({ page }) => {
    // Step 1: Navigate to People page
    await page.click('nav a[href="/people"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 2: Check for proper ARIA labels and accessibility
    const quickActionButtons = page.locator('.quick-action-btn');
    if (await quickActionButtons.count() > 0) {
      const firstButton = quickActionButtons.first();
      
      // Verify button has accessible text
      const buttonText = await firstButton.textContent();
      expect(buttonText?.trim()).toBeTruthy();
      
      // Verify button is keyboard accessible
      await firstButton.focus();
      await expect(firstButton).toBeFocused();
    }

    // Step 3: Test PersonDetails page accessibility
    const personLinks = page.locator('table tbody tr td a');
    if (await personLinks.count() > 0) {
      await personLinks.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Check insights section accessibility
      const actionButtons = page.locator('.action-btn');
      if (await actionButtons.count() > 0) {
        const firstActionButton = actionButtons.first();
        await firstActionButton.focus();
        await expect(firstActionButton).toBeFocused();
      }
    }
  });

  test('should display correct status indicators and colors', async ({ page }) => {
    // Step 1: Navigate to People page
    await page.click('nav a[href="/people"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 2: Check for workload status indicators
    const statusIndicators = page.locator('.status-indicator');
    if (await statusIndicators.count() > 0) {
      // Verify different status colors exist
      const dangerStatus = page.locator('.status-danger');
      const warningStatus = page.locator('.status-warning');
      const successStatus = page.locator('.status-success');
      const infoStatus = page.locator('.status-info');

      // At least one status type should be present
      const totalStatuses = await dangerStatus.count() + 
                            await warningStatus.count() + 
                            await successStatus.count() + 
                            await infoStatus.count();
      expect(totalStatuses).toBeGreaterThan(0);
    }

    // Step 3: Check PersonDetails status indicators
    const personLinks = page.locator('table tbody tr td a');
    if (await personLinks.count() > 0) {
      await personLinks.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Verify insight cards have proper styling
      const insightCards = page.locator('.insight-card');
      await expect(insightCards.first()).toBeVisible();

      // Check for status badges
      const statusBadges = page.locator('.insight-status');
      if (await statusBadges.count() > 0) {
        await expect(statusBadges.first()).toBeVisible();
      }
    }
  });
});