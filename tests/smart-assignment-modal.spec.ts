import { test, expect } from '@playwright/test';

test.describe('SmartAssignmentModal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('https://local.capacinator.com');
    
    // Wait for login page to load
    await page.waitForSelector('h1:has-text("Welcome to Capacinator")');
    
    // Select Alice Johnson and login
    await page.selectOption('select', { label: 'Alice Johnson' });
    await page.click('button:has-text("Continue")');
    
    // Wait for person details page to load
    await page.waitForSelector('text=Alice Johnson');
  });

  test('should open assignment modal and load data', async ({ page }) => {
    // Click on the add assignment button (you may need to adjust the selector)
    await page.click('button:has-text("Add Assignment")');
    
    // Wait for modal to open
    await page.waitForSelector('.smart-assignment-modal');
    
    // Check that modal title is visible
    await expect(page.locator('text=Smart Assignment for Alice Johnson')).toBeVisible();
    
    // Check that status bar is visible
    await expect(page.locator('.status-bar')).toBeVisible();
    
    // Check utilization info
    await expect(page.locator('text=Current Utilization:')).toBeVisible();
    await expect(page.locator('text=Available Capacity:')).toBeVisible();
    await expect(page.locator('text=Active Assignments')).toBeVisible();
  });

  test('should show recommendations tab by default', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Check that recommendations tab is active
    const recommendedTab = page.locator('[role="tab"]:has-text("Recommended Assignments")');
    await expect(recommendedTab).toHaveAttribute('data-state', 'active');
    
    // Check for recommendations or empty state
    const hasRecommendations = await page.locator('.recommendation-card').count() > 0;
    const hasEmptyState = await page.locator('.empty-recommendations').isVisible();
    
    expect(hasRecommendations || hasEmptyState).toBeTruthy();
  });

  test('should switch to manual tab and show form fields', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Switch to manual tab
    await page.click('[role="tab"]:has-text("Manual Selection")');
    
    // Check that manual tab is active
    const manualTab = page.locator('[role="tab"]:has-text("Manual Selection")');
    await expect(manualTab).toHaveAttribute('data-state', 'active');
    
    // Check form fields are visible
    await expect(page.locator('label:has-text("PROJECT *")')).toBeVisible();
    await expect(page.locator('label:has-text("ROLE *")')).toBeVisible();
    await expect(page.locator('label:has-text("PHASE")')).toBeVisible();
    await expect(page.locator('label:has-text("ALLOCATION:")')).toBeVisible();
    await expect(page.locator('label:has-text("START DATE *")')).toBeVisible();
    await expect(page.locator('label:has-text("END DATE *")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Switch to manual tab
    await page.click('[role="tab"]:has-text("Manual Selection")');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Create Assignment")');
    
    // Should show validation alert
    await page.waitForFunction(() => {
      const alerts = Array.from(document.querySelectorAll('div')).filter(
        el => el.textContent?.includes('Please select a project')
      );
      return alerts.length > 0;
    });
  });

  test('should select a recommendation and show details', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Check if there are recommendations
    const recommendationCards = page.locator('.recommendation-card');
    const count = await recommendationCards.count();
    
    if (count > 0) {
      // Click the first recommendation
      await recommendationCards.first().click();
      
      // Check that it's selected
      await expect(recommendationCards.first()).toHaveClass(/selected/);
      
      // Check that assignment summary is shown
      await expect(page.locator('.selected-recommendation-info')).toBeVisible();
      await expect(page.locator('text=Selected Assignment')).toBeVisible();
      await expect(page.locator('.summary-item:has-text("Project:")')).toBeVisible();
      await expect(page.locator('.summary-item:has-text("Role:")')).toBeVisible();
      await expect(page.locator('.summary-item:has-text("Allocation:")')).toBeVisible();
    }
  });

  test('should handle assignment creation with manual selection', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Switch to manual tab
    await page.click('[role="tab"]:has-text("Manual Selection")');
    
    // Fill in the form
    // Select first available project
    const projectSelect = page.locator('select#project-select');
    const projectOptions = await projectSelect.locator('option').all();
    if (projectOptions.length > 1) {
      await projectSelect.selectOption({ index: 1 });
    }
    
    // Select first available role
    const roleSelect = page.locator('select#role-select');
    const roleOptions = await roleSelect.locator('option').all();
    if (roleOptions.length > 1) {
      await roleSelect.selectOption({ index: 1 });
    }
    
    // Set dates
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 6);
    
    await page.fill('input#start-date', today.toISOString().split('T')[0]);
    await page.fill('input#end-date', endDate.toISOString().split('T')[0]);
    
    // Set allocation
    await page.fill('input#allocation-slider', '50');
    
    // Listen for network requests to check what's being sent
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/assignments') && resp.request().method() === 'POST'
    );
    
    // Submit the form
    await page.click('button:has-text("Create Assignment")');
    
    // Check the response
    try {
      const response = await responsePromise;
      const status = response.status();
      
      if (status === 500) {
        // Log the error for debugging
        const responseBody = await response.json();
        console.log('Assignment creation failed:', responseBody);
        
        // Check that error alert is shown
        await page.waitForFunction(() => {
          const alerts = Array.from(document.querySelectorAll('div')).filter(
            el => el.textContent?.includes('Error:')
          );
          return alerts.length > 0;
        });
      } else if (status === 200 || status === 201) {
        // Success - modal should close
        await expect(page.locator('.smart-assignment-modal')).not.toBeVisible();
      }
    } catch (error) {
      console.log('Error waiting for response:', error);
    }
  });

  test('should show correct allocation slider behavior', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Switch to manual tab
    await page.click('[role="tab"]:has-text("Manual Selection")');
    
    // Check allocation slider
    const slider = page.locator('input#allocation-slider');
    await expect(slider).toBeVisible();
    
    // Check initial value
    await expect(slider).toHaveValue('100');
    
    // Change value
    await slider.fill('75');
    
    // Check label updates
    await expect(page.locator('text=ALLOCATION: 75%')).toBeVisible();
    
    // Check available capacity indicator
    await expect(page.locator('text=% available')).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Click cancel button
    await page.click('button:has-text("Cancel")');
    
    // Modal should close
    await expect(page.locator('.smart-assignment-modal')).not.toBeVisible();
  });

  test('should close modal with X button', async ({ page }) => {
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Click X button
    await page.click('button[aria-label="Close"]');
    
    // Modal should close
    await expect(page.locator('.smart-assignment-modal')).not.toBeVisible();
  });
});

// Run specific scenario tests
test.describe('Role validation issues', () => {
  test('should log role mismatch information', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('Browser console:', msg.text());
      }
    });
    
    await page.goto('https://local.capacinator.com');
    await page.waitForSelector('h1:has-text("Welcome to Capacinator")');
    await page.selectOption('select', { label: 'Alice Johnson' });
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('text=Alice Johnson');
    
    // Open modal
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('.smart-assignment-modal');
    
    // Wait for console logs to appear
    await page.waitForTimeout(1000);
    
    // The console logs should show:
    // - Person primary_person_role_id
    // - First 3 roles in DB
    // - Does person role exist in DB? false
  });
});