import { test, expect, Page } from '@playwright/test';

test.describe('Allocation Wizard - Comprehensive E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the allocation wizard
    await page.goto('/wizard');
    
    // Handle login if required
    const loginContainer = page.locator('.login-container');
    if (await loginContainer.isVisible({ timeout: 5000 })) {
      // Select a user from dropdown
      await page.selectOption('#person-select', '123e4567-e89b-12d3-a456-426614174000');
      
      // Find and click login button
      const loginButton = page.locator('.login-button, button[type="submit"], input[type="submit"], button').first();
      await loginButton.click();
      
      // Wait for login to complete
      await page.waitForFunction(() => !document.querySelector('.login-container'), { timeout: 10000 });
      
      // Navigate to wizard after login
      await page.goto('/wizard');
    }
    
    // Wait for wizard to load
    await page.waitForSelector('.allocation-wizard', { timeout: 15000 });
  });

  test.describe('Initial Wizard State and Navigation', () => {
    
    test('should display wizard header and progress indicator correctly', async ({ page }) => {
      // Check main header
      await expect(page.locator('h1')).toContainText('Resource Allocation Wizard');
      await expect(page.locator('.wizard-header p')).toContainText('Guided resource allocation');
      
      // Verify progress indicator shows 5 steps
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps).toHaveCount(5);
      
      // Check step titles
      const stepTitles = ['Select Projects', 'Analyze Gaps', 'Find Resources', 'Allocation Strategy', 'Review & Confirm'];
      for (let i = 0; i < stepTitles.length; i++) {
        await expect(progressSteps.nth(i).locator('.step-title')).toContainText(stepTitles[i]);
      }
      
      // First step should be current
      await expect(progressSteps.first()).toHaveClass(/current/);
      
      // Other steps should be pending
      for (let i = 1; i < 5; i++) {
        await expect(progressSteps.nth(i)).not.toHaveClass(/current|completed/);
      }
    });

    test('should have correct initial button states', async ({ page }) => {
      // Previous button should be disabled on first step
      const prevButton = page.locator('button', { hasText: 'Previous' });
      await expect(prevButton).toBeDisabled();
      
      // Next button should be disabled initially (no projects selected)
      const nextButton = page.locator('button', { hasText: 'Next' });
      await expect(nextButton).toBeDisabled();
      
      // Start Over button should be enabled
      const startOverButton = page.locator('button', { hasText: 'Start Over' });
      await expect(startOverButton).toBeEnabled();
      
      // Progress bar should show 20% (1/5 steps)
      const progressBar = page.locator('.progress-fill');
      const width = await progressBar.evaluate(el => el.style.width);
      expect(width).toBe('20%');
    });

    test('should display project selection step content', async ({ page }) => {
      await expect(page.locator('h2')).toContainText('Select Projects');
      await expect(page.locator('.wizard-step-description')).toContainText('Choose the projects that need resource allocation');
      
      // Should show available projects section
      await expect(page.locator('h3')).toContainText('Available Projects');
      
      // Should have project items
      const projectItems = page.locator('.wizard-item');
      await expect(projectItems).toHaveCount(4); // Based on mock data
      
      // Check project details are visible
      await expect(projectItems.first().locator('.wizard-item-title')).toBeVisible();
      await expect(projectItems.first().locator('.wizard-item-details')).toBeVisible();
    });
  });

  test.describe('Step 1: Project Selection Functionality', () => {

    test('should allow selecting and deselecting projects', async ({ page }) => {
      const projectItems = page.locator('.wizard-item');
      const firstProject = projectItems.first();
      const secondProject = projectItems.nth(1);
      
      // Initially no projects should be selected
      await expect(firstProject).not.toHaveClass(/selected/);
      
      // Click first project
      await firstProject.click();
      await expect(firstProject).toHaveClass(/selected/);
      
      // Checkbox should be checked
      const checkbox = firstProject.locator('.wizard-checkbox');
      await expect(checkbox).toHaveClass(/checked/);
      
      // Next button should be enabled
      const nextButton = page.locator('button', { hasText: 'Next' });
      await expect(nextButton).toBeEnabled();
      
      // Select second project
      await secondProject.click();
      await expect(secondProject).toHaveClass(/selected/);
      
      // Stats should update
      await expect(page.locator('.wizard-stat-value').first()).toContainText('2');
      
      // Deselect first project
      await firstProject.click();
      await expect(firstProject).not.toHaveClass(/selected/);
      await expect(page.locator('.wizard-stat-value').first()).toContainText('1');
    });

    test('should display project statistics correctly', async ({ page }) => {
      const projectItems = page.locator('.wizard-item');
      
      // Select multiple projects
      await projectItems.nth(0).click();
      await projectItems.nth(1).click();
      await projectItems.nth(2).click();
      
      // Wait for stats to update
      await page.waitForTimeout(500);
      
      // Check stats are displayed
      const stats = page.locator('.wizard-stat');
      await expect(stats).toHaveCount(2);
      
      await expect(stats.first().locator('.wizard-stat-label')).toContainText('Projects Selected');
      await expect(stats.nth(1).locator('.wizard-stat-label')).toContainText('Total Resource Gaps');
      
      // Values should be numeric
      const projectCount = await stats.first().locator('.wizard-stat-value').textContent();
      const gapCount = await stats.nth(1).locator('.wizard-stat-value').textContent();
      
      expect(parseInt(projectCount || '0')).toBeGreaterThan(0);
      expect(parseInt(gapCount || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should show project details including timeline and roles', async ({ page }) => {
      const firstProject = page.locator('.wizard-item').first();
      
      // Check timeline is displayed
      await expect(firstProject.locator('.wizard-item-details')).toContainText(/\w{3} \d{1,2}, \d{4}/); // Date format
      
      // Check people assignment info
      await expect(firstProject.locator('.wizard-item-details')).toContainText(/\d+\/\d+ people assigned/);
      
      // Check role tags
      const roleTags = firstProject.locator('.wizard-item-details span');
      await expect(roleTags.first()).toBeVisible();
    });
  });

  test.describe('Step 2: Gap Analysis', () => {

    test('should proceed to gap analysis after project selection', async ({ page }) => {
      // Select projects
      await page.locator('.wizard-item').first().click();
      await page.locator('.wizard-item').nth(1).click();
      
      // Click Next
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Should be on step 2
      await expect(page.locator('h2')).toContainText('Gap Analysis');
      
      // Progress should show step 2 as current
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps.nth(1)).toHaveClass(/current/);
      await expect(progressSteps.first()).toHaveClass(/completed/);
      
      // Should show processing state initially
      await expect(page.locator('.wizard-step-description')).toContainText('Analyzing your selected projects');
      
      // Wait for analysis to complete
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      // Should show results
      await expect(page.locator('h2')).toContainText('Gap Analysis Results');
    });

    test('should display gap analysis results correctly', async ({ page }) => {
      // Go through project selection
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Wait for analysis
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      // Check stats are displayed
      const stats = page.locator('.wizard-stat');
      await expect(stats).toHaveCount(4);
      
      const statLabels = ['High Priority Gaps', 'Medium Priority Gaps', 'Low Priority Gaps', 'Total Hours Needed'];
      for (let i = 0; i < statLabels.length; i++) {
        await expect(stats.nth(i).locator('.wizard-stat-label')).toContainText(statLabels[i]);
      }
      
      // Should show gaps by priority
      await expect(page.locator('h3')).toContainText('Resource Gaps by Priority');
      
      // Should show skills summary
      await expect(page.locator('h3').nth(1)).toContainText('Skills Summary');
    });

    test('should handle case with no gaps found', async ({ page }) => {
      // This would require mock data setup for a fully staffed project
      // For now, we'll test the UI structure
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      
      await page.waitForSelector('h2', { timeout: 10000 });
      
      // Either gaps found or no gaps message should be shown
      const hasGaps = await page.locator('text=Gap Analysis Results').isVisible();
      const noGaps = await page.locator('text=All Projects Fully Staffed').isVisible();
      
      expect(hasGaps || noGaps).toBeTruthy();
    });
  });

  test.describe('Step 3: Resource Discovery', () => {

    test('should proceed to resource discovery and find suggestions', async ({ page }) => {
      // Complete steps 1-2
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Should show resource discovery
      await expect(page.locator('h2')).toContainText('Finding Available Resources');
      
      // Wait for suggestions
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      
      // Should show results
      await expect(page.locator('h2')).toContainText('Available Resources Found');
      
      // Should show stats
      const stats = page.locator('.wizard-stat');
      await expect(stats).toHaveCount(4);
      
      // Should show resources by role
      await expect(page.locator('h3')).toContainText('Available Resources by Role');
    });

    test('should display resource suggestions with skill matches', async ({ page }) => {
      // Navigate to step 3
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      
      // Check resource items
      const resourceItems = page.locator('.wizard-item');
      if (await resourceItems.count() > 0) {
        const firstResource = resourceItems.first();
        
        // Should show person name
        await expect(firstResource.locator('.wizard-item-title')).toBeVisible();
        
        // Should show available hours
        await expect(firstResource.locator('.wizard-item-details')).toContainText(/\d+ hours available/);
        
        // Should show skill match percentage
        await expect(firstResource.locator('.wizard-item-actions')).toContainText(/\d+% match/);
      }
    });

    test('should show resource coverage analysis', async ({ page }) => {
      // Navigate to step 3
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      
      // Should show coverage analysis
      await expect(page.locator('h3').nth(1)).toContainText('Resource Coverage Analysis');
      
      // Should show coverage percentages
      const coverageItems = page.locator('text=/\d+% covered/');
      if (await coverageItems.count() > 0) {
        await expect(coverageItems.first()).toBeVisible();
      }
    });
  });

  test.describe('Step 4: Allocation Strategy', () => {

    test('should proceed to allocation strategy step', async ({ page }) => {
      // Navigate through steps 1-3
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Should show allocation strategy
      await expect(page.locator('h2')).toContainText('Generating Allocation Strategy');
      
      // Wait for plans to be generated
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await expect(page.locator('h2')).toContainText('Allocation Strategy');
    });

    test('should display auto/manual toggle correctly', async ({ page }) => {
      // Navigate to step 4
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      
      // Should show auto mode toggle
      await expect(page.locator('text=Automatic Allocation')).toBeVisible();
      
      // Toggle should be active by default
      const toggle = page.locator('.toggle-switch');
      await expect(toggle).toHaveClass(/active/);
      
      // Click to disable auto mode
      await toggle.click();
      await expect(toggle).not.toHaveClass(/active/);
      
      // Should show regenerate button in manual mode
      await expect(page.locator('button', { hasText: 'Regenerate' })).toBeVisible();
    });

    test('should show allocation plans with confidence scores', async ({ page }) => {
      // Navigate to step 4
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      
      // Should show allocation plans
      const plans = page.locator('.wizard-item');
      if (await plans.count() > 0) {
        const firstPlan = plans.first();
        
        // Should show person → role assignment
        await expect(firstPlan.locator('.wizard-item-title')).toContainText('→');
        
        // Should show confidence percentage
        await expect(firstPlan.locator('.wizard-item-actions')).toContainText(/\d+% confidence/);
        
        // Should show hours allocated
        await expect(firstPlan.locator('.wizard-item-details')).toContainText(/\d+ hours allocated/);
      }
    });

    test('should allow manual allocation editing', async ({ page }) => {
      // Navigate to step 4
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      
      // Switch to manual mode
      await page.locator('.toggle-switch').click();
      
      // Should show editable input fields
      const hourInputs = page.locator('input[type="number"]');
      if (await hourInputs.count() > 0) {
        const firstInput = hourInputs.first();
        await expect(firstInput).toBeVisible();
        
        // Should be editable
        await firstInput.fill('25');
        await expect(firstInput).toHaveValue('25');
      }
    });
  });

  test.describe('Step 5: Review & Confirm', () => {

    test('should proceed to final review step', async ({ page }) => {
      // Navigate through all steps
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Should show review step
      await expect(page.locator('h2')).toContainText('Review & Confirm');
      
      // Progress should show step 5 as current
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps.nth(4)).toHaveClass(/current/);
      
      // Previous steps should be completed
      for (let i = 0; i < 4; i++) {
        await expect(progressSteps.nth(i)).toHaveClass(/completed/);
      }
    });

    test('should display impact analysis correctly', async ({ page }) => {
      // Navigate to step 5
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Should show impact analysis
      await expect(page.locator('h3')).toContainText('Impact Analysis');
      
      // Should show coverage percentage
      const coveragePercentage = page.locator('.wizard-stat-value').first();
      await expect(coveragePercentage).toContainText(/%/);
      
      // Should show impact message
      const impactMessages = [
        'Excellent Coverage',
        'Good Coverage', 
        'Partial Coverage',
        'Insufficient Coverage'
      ];
      
      let messageFound = false;
      for (const message of impactMessages) {
        if (await page.locator(`text=${message}`).isVisible()) {
          messageFound = true;
          break;
        }
      }
      expect(messageFound).toBeTruthy();
    });

    test('should show detailed allocation summary', async ({ page }) => {
      // Navigate to step 5
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Should show project summary
      await expect(page.locator('h3').nth(1)).toContainText('Project Summary');
      
      // Should show detailed allocations
      await expect(page.locator('h3').nth(2)).toContainText('Detailed Allocations');
      
      // Should show apply button
      const applyButton = page.locator('button', { hasText: 'Apply Allocations' });
      await expect(applyButton).toBeVisible();
      await expect(applyButton).toBeEnabled();
    });

    test('should show confirmation dialog before applying', async ({ page }) => {
      // Navigate to step 5
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Setup dialog handler
      let dialogShown = false;
      page.on('dialog', async dialog => {
        dialogShown = true;
        expect(dialog.message()).toContain('Are you sure you want to apply');
        await dialog.dismiss();
      });
      
      // Click apply button
      await page.locator('button', { hasText: 'Apply Allocations' }).click();
      
      // Wait a moment for dialog
      await page.waitForTimeout(1000);
      expect(dialogShown).toBeTruthy();
    });

    test('should complete full allocation flow with success feedback', async ({ page }) => {
      // Navigate through complete wizard flow
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Setup dialog handlers
      let confirmDialogShown = false;
      let successDialogShown = false;
      let successMessage = '';
      
      page.on('dialog', async dialog => {
        if (dialog.message().includes('Are you sure you want to apply')) {
          confirmDialogShown = true;
          await dialog.accept(); // Accept the confirmation
        } else if (dialog.message().includes('Success!')) {
          successDialogShown = true;
          successMessage = dialog.message();
          await dialog.accept();
        }
      });
      
      // Click apply button
      await page.locator('button', { hasText: 'Apply Allocations' }).click();
      
      // Wait for processing to complete
      await page.waitForSelector('text=Applying Allocations', { timeout: 5000 });
      await page.waitForSelector('text=Select Projects', { timeout: 15000 }); // Should reset to step 1
      
      // Verify dialogs were shown
      expect(confirmDialogShown).toBeTruthy();
      expect(successDialogShown).toBeTruthy();
      expect(successMessage).toContain('Success!');
      expect(successMessage).toContain('resource allocations have been applied successfully');
      
      // Verify wizard reset to step 1
      await expect(page.locator('h2')).toContainText('Select Projects');
      
      // Verify progress indicator reset
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps.first()).toHaveClass(/current/);
      await expect(progressSteps.nth(1)).not.toHaveClass(/current|completed/);
    });

    test('should complete full allocation flow using Complete Wizard button', async ({ page }) => {
      // Navigate through complete wizard flow
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Allocation Strategy', { timeout: 10000 });
      await page.locator('button', { hasText: 'Next' }).click();
      
      // Verify Complete Wizard button is visible and enabled
      const completeButton = page.locator('button', { hasText: 'Complete Wizard' });
      await expect(completeButton).toBeVisible();
      await expect(completeButton).toBeEnabled();
      
      // Setup dialog handlers
      let confirmDialogShown = false;
      let successDialogShown = false;
      let successMessage = '';
      
      page.on('dialog', async dialog => {
        if (dialog.message().includes('Are you sure you want to apply')) {
          confirmDialogShown = true;
          await dialog.accept(); // Accept the confirmation
        } else if (dialog.message().includes('Success!')) {
          successDialogShown = true;
          successMessage = dialog.message();
          await dialog.accept();
        }
      });
      
      // Click Complete Wizard button (the main footer button)
      await completeButton.click();
      
      // Wait for processing to complete
      await page.waitForSelector('text=Applying Allocations', { timeout: 5000 });
      await page.waitForSelector('text=Select Projects', { timeout: 15000 }); // Should reset to step 1
      
      // Verify dialogs were shown
      expect(confirmDialogShown).toBeTruthy();
      expect(successDialogShown).toBeTruthy();
      expect(successMessage).toContain('Success!');
      expect(successMessage).toContain('resource allocations have been applied successfully');
      
      // Verify wizard reset to step 1
      await expect(page.locator('h2')).toContainText('Select Projects');
      
      // Verify progress indicator reset
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps.first()).toHaveClass(/current/);
      await expect(progressSteps.nth(1)).not.toHaveClass(/current|completed/);
    });
  });

  test.describe('Navigation and State Management', () => {

    test('should allow navigation between steps', async ({ page }) => {
      // Go to step 2
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      // Go back to step 1
      await page.locator('button', { hasText: 'Previous' }).click();
      await expect(page.locator('h2')).toContainText('Select Projects');
      
      // Project should still be selected
      await expect(page.locator('.wizard-item').first()).toHaveClass(/selected/);
      
      // Forward again
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
    });

    test('should maintain state when using Start Over', async ({ page }) => {
      // Select projects and go to step 2
      await page.locator('.wizard-item').first().click();
      await page.locator('.wizard-item').nth(1).click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      // Click Start Over
      await page.locator('button', { hasText: 'Start Over' }).click();
      
      // Should be back to step 1
      await expect(page.locator('h2')).toContainText('Select Projects');
      
      // Projects should be deselected
      await expect(page.locator('.wizard-item').first()).not.toHaveClass(/selected/);
      
      // Progress should be reset
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps.first()).toHaveClass(/current/);
      await expect(progressSteps.nth(1)).not.toHaveClass(/current|completed/);
    });

    test('should update progress bar correctly', async ({ page }) => {
      const progressBar = page.locator('.progress-fill');
      
      // Step 1: 20%
      let width = await progressBar.evaluate(el => el.style.width);
      expect(width).toBe('20%');
      
      // Go to step 2: 40%
      await page.locator('.wizard-item').first().click();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      width = await progressBar.evaluate(el => el.style.width);
      expect(width).toBe('40%');
      
      // Go to step 3: 60%
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Available Resources Found', { timeout: 10000 });
      
      width = await progressBar.evaluate(el => el.style.width);
      expect(width).toBe('60%');
    });
  });

  test.describe('Responsive Design', () => {

    test('should work correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Header should be visible
      await expect(page.locator('h1')).toBeVisible();
      
      // Progress steps should be stacked on mobile
      const progressSteps = page.locator('.progress-step');
      await expect(progressSteps).toHaveCount(5);
      
      // Navigation buttons should be visible
      await expect(page.locator('button', { hasText: 'Start Over' })).toBeVisible();
    });

    test('should work correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // All elements should be visible
      await expect(page.locator('.allocation-wizard')).toBeVisible();
      await expect(page.locator('.wizard-progress')).toBeVisible();
      await expect(page.locator('.wizard-footer')).toBeVisible();
    });
  });

  test.describe('Performance and Loading', () => {

    test('should load wizard within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/wizard');
      await page.waitForSelector('.allocation-wizard');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle step transitions smoothly', async ({ page }) => {
      // Select project
      await page.locator('.wizard-item').first().click();
      
      const startTime = Date.now();
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForSelector('text=Gap Analysis Results', { timeout: 10000 });
      
      const transitionTime = Date.now() - startTime;
      expect(transitionTime).toBeLessThan(8000); // Gap analysis should complete within 8 seconds
    });
  });
});