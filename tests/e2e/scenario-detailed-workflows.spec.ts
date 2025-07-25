import { test, expect } from '@playwright/test';

/**
 * Deep Dive into Scenario Comparison and Merge Workflows
 * This test demonstrates the actual detailed interfaces for comparison and merging
 */
test.describe('Detailed Scenario Comparison and Merge Workflows', () => {

  async function loginAndNavigateToScenarios(page: any) {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasLogin = await page.locator('#person-select').count() > 0;
    if (hasLogin) {
      await page.selectOption('#person-select', '123e4567-e89b-12d3-a456-426614174000');
      await page.click('.login-button');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    await page.waitForSelector('.scenario-card, .scenarios-grid, h1:has-text("Scenario")', { timeout: 15000 });
  }

  async function takeScreenshot(page: any, filename: string, description: string) {
    console.log(`📸 ${description}`);
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    await page.waitForTimeout(1500);
  }

  test('Deep Dive: Scenario Comparison Interface', async ({ page }) => {
    console.log('🔍 DEEP DIVE: Scenario Comparison Interface');
    console.log('==========================================');

    await loginAndNavigateToScenarios(page);
    await takeScreenshot(page, 'comparison-01-scenarios-page.png', 'Starting point: Scenarios overview');

    // Find scenarios to compare - look for different types
    const scenarioCards = await page.locator('.scenario-card').count();
    console.log(`📊 Found ${scenarioCards} scenarios available for comparison`);

    if (scenarioCards < 2) {
      console.log('⚠️ Need at least 2 scenarios for comparison. Creating additional scenario...');
      
      await page.click('button:has-text("New Scenario")');
      await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
      await page.fill('input[id="scenario-name"]', 'Comparison Test Scenario');
      await page.fill('textarea[id="scenario-description"]', 'Created specifically for comparison testing');
      await page.selectOption('select[id="scenario-type"]', 'branch');
      await page.click('button:has-text("Create Scenario")');
      await page.waitForTimeout(3000);
    }

    // Test comparison workflow step by step
    console.log('\n🔍 Step 1: Initiating comparison...');
    const firstScenario = page.locator('.scenario-card').first();
    const firstScenarioName = await firstScenario.locator('h3, .scenario-name, h2').first().textContent();
    console.log(`🎯 Starting comparison from: ${firstScenarioName}`);

    await firstScenario.hover();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'comparison-02-hover-actions.png', 'Scenario actions revealed on hover');

    const compareButton = firstScenario.locator('button:has-text("Compare")').first();
    await compareButton.click();
    await page.waitForTimeout(3000);

    // Check what type of comparison interface we get
    console.log('\n🔍 Step 2: Analyzing comparison interface...');
    
    // Option 1: Modal-based comparison
    if (await page.locator('[role="dialog"] > div').count() > 0) {
      console.log('📋 Modal-based comparison interface detected');
      await takeScreenshot(page, 'comparison-03-modal-interface.png', 'Comparison modal opened');
      
      // Look for comparison selection dropdown
      const comparisonSelect = page.locator('select[name="compare_to"], select[id="comparison-target"], .comparison-select').first();
      if (await comparisonSelect.count() > 0) {
        console.log('📝 Comparison target selector found');
        await takeScreenshot(page, 'comparison-04-target-selector.png', 'Comparison target selection available');
        
        // Try to select different comparison targets
        const options = await comparisonSelect.locator('option').count();
        console.log(`📊 Found ${options} comparison options`);
        
        if (options > 1) {
          await comparisonSelect.selectOption({ index: 1 }); // Select second option
          await page.waitForTimeout(1000);
          await takeScreenshot(page, 'comparison-05-target-selected.png', 'Comparison target selected');
        }
        
        // Look for comparison execution button
        const runComparisonButton = page.locator('button:has-text("Compare"), button:has-text("Run Comparison"), button:has-text("Show Differences")').first();
        if (await runComparisonButton.count() > 0) {
          console.log('🚀 Running comparison...');
          await runComparisonButton.click();
          await page.waitForTimeout(4000);
          await takeScreenshot(page, 'comparison-06-results-modal.png', 'Comparison results in modal');
          
          // Look for detailed comparison results
          await page.waitForTimeout(2000);
          const hasResults = await page.locator('.comparison-results, .differences, .comparison-details, table').count();
          if (hasResults > 0) {
            console.log('📊 Detailed comparison results found');
            await takeScreenshot(page, 'comparison-07-detailed-results.png', 'Detailed comparison results displayed');
          }
        }
        
        await page.press('Escape'); // Close modal
      }
    }
    
    // Option 2: Navigate to comparison page
    else if (await page.url().includes('compare') || await page.url().includes('comparison')) {
      console.log('🌐 Navigated to dedicated comparison page');
      await takeScreenshot(page, 'comparison-03-dedicated-page.png', 'Dedicated comparison page');
      
      // Look for comparison interface elements
      const comparisonElements = await page.locator('.comparison-container, .scenario-comparison, .differences-view').count();
      if (comparisonElements > 0) {
        console.log('📊 Comparison interface elements found on page');
        await takeScreenshot(page, 'comparison-04-page-interface.png', 'Comparison page interface elements');
      }
      
      // Look for scenario selector or comparison controls
      const selectors = await page.locator('select, .scenario-selector, .comparison-controls').count();
      if (selectors > 0) {
        console.log('🎛️ Comparison controls found');
        await takeScreenshot(page, 'comparison-05-page-controls.png', 'Comparison page controls');
      }
      
      // Wait for any dynamic content to load
      await page.waitForTimeout(3000);
      await takeScreenshot(page, 'comparison-06-full-comparison-page.png', 'Full comparison page after loading');
      
      // Navigate back to scenarios
      await page.click('a[href="/scenarios"], nav a:has-text("Scenarios")');
      await page.waitForTimeout(2000);
    }
    
    // Option 3: In-page comparison or other interface
    else {
      console.log('🔄 Alternative comparison interface');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'comparison-03-alternative-interface.png', 'Alternative comparison interface');
      
      // Look for any comparison-related elements that appeared
      const comparisonElements = [
        '.comparison-view',
        '.scenario-diff',
        '.comparison-results',
        '[data-testid="comparison"]',
        '.differences',
        '.scenario-comparison'
      ];
      
      for (const selector of comparisonElements) {
        if (await page.locator(selector).count() > 0) {
          console.log(`📊 Found comparison element: ${selector}`);
          await takeScreenshot(page, `comparison-04-element-${selector.replace(/[^a-zA-Z0-9]/g, '')}.png`, `Comparison element: ${selector}`);
        }
      }
    }

    console.log('✅ Comparison interface analysis complete');
  });

  test('Deep Dive: Merge Workflow and Conflict Resolution', async ({ page }) => {
    console.log('🔄 DEEP DIVE: Merge Workflow and Conflict Resolution');
    console.log('================================================');

    await loginAndNavigateToScenarios(page);
    await takeScreenshot(page, 'merge-01-scenarios-overview.png', 'Starting point: Scenarios for merge testing');

    // Look for scenarios with merge capability (child scenarios)
    console.log('\n🔍 Step 1: Finding scenarios with merge capability...');
    const allScenarios = await page.locator('.scenario-card').count();
    let mergeableScenario = null;
    let mergeableScenarioName = '';

    // Look for scenarios that show parent relationship (these can be merged)
    for (let i = 0; i < allScenarios; i++) {
      const scenarioCard = page.locator('.scenario-card').nth(i);
      const hasParentInfo = await scenarioCard.locator(':has-text("From"), :has-text("Branched"), .branch-info').count();
      
      if (hasParentInfo > 0) {
        mergeableScenario = scenarioCard;
        mergeableScenarioName = await scenarioCard.locator('h3, .scenario-name, h2').first().textContent();
        console.log(`🎯 Found mergeable scenario: ${mergeableScenarioName}`);
        break;
      }
    }

    // If no mergeable scenario found, create one
    if (!mergeableScenario) {
      console.log('📝 No mergeable scenario found. Creating parent-child scenario pair...');
      
      // Create parent scenario
      await page.click('button:has-text("New Scenario")');
      await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
      await page.fill('input[id="scenario-name"]', 'Merge Parent Test');
      await page.fill('textarea[id="scenario-description"]', 'Parent scenario for merge testing');
      await page.selectOption('select[id="scenario-type"]', 'branch');
      await page.click('button:has-text("Create Scenario")');
      await page.waitForTimeout(3000);

      // Create child scenario by branching from parent
      const parentCard = page.locator('.scenario-card:has-text("Merge Parent Test")').first();
      await parentCard.hover();
      await page.waitForTimeout(1000);
      
      const branchButton = parentCard.locator('button:has-text("Branch")').first();
      await branchButton.click();
      await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
      await page.fill('input[id="scenario-name"]', 'Merge Child Test');
      await page.fill('textarea[id="scenario-description"]', 'Child scenario that will be merged back to parent');
      await page.click('button:has-text("Create Scenario")');
      await page.waitForTimeout(3000);

      mergeableScenario = page.locator('.scenario-card:has-text("Merge Child Test")').first();
      mergeableScenarioName = 'Merge Child Test';
      await takeScreenshot(page, 'merge-02-created-mergeable-scenario.png', 'Created parent-child scenario pair for merge testing');
    }

    // Test the merge workflow
    console.log(`\n🔄 Step 2: Testing merge workflow for: ${mergeableScenarioName}`);
    await mergeableScenario.hover();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'merge-03-mergeable-scenario-hover.png', 'Mergeable scenario with actions revealed');

    // Look for merge button with various selectors
    const mergeSelectors = [
      'button:has-text("Merge")',
      '.merge-button',
      '[title*="Merge"]',
      '.action-button.merge',
      'button[data-action="merge"]'
    ];

    let mergeButton = null;
    for (const selector of mergeSelectors) {
      const button = mergeableScenario.locator(selector).first();
      if (await button.count() > 0) {
        mergeButton = button;
        console.log(`✅ Found merge button with selector: ${selector}`);
        break;
      }
    }

    if (mergeButton) {
      await takeScreenshot(page, 'merge-04-merge-button-found.png', 'Merge button identified on child scenario');
      
      console.log('🚀 Initiating merge workflow...');
      await mergeButton.click();
      await page.waitForTimeout(3000);

      // Check what type of merge interface we get
      console.log('\n🔍 Step 3: Analyzing merge interface...');

      // Option 1: Merge modal with options
      if (await page.locator('[role="dialog"] > div').count() > 0) {
        console.log('📋 Merge modal interface detected');
        await takeScreenshot(page, 'merge-05-merge-modal.png', 'Merge modal opened');

        // Look for merge strategy options
        const mergeStrategySelect = page.locator('select[name="merge_strategy"], select[name="resolve_conflicts_as"], .merge-strategy').first();
        if (await mergeStrategySelect.count() > 0) {
          console.log('⚙️ Merge strategy options found');
          await takeScreenshot(page, 'merge-06-strategy-options.png', 'Merge strategy selection available');
          
          // Try different merge strategies
          const strategies = await mergeStrategySelect.locator('option').count();
          console.log(`📊 Found ${strategies} merge strategy options`);
          
          for (let i = 0; i < Math.min(strategies, 3); i++) {
            await mergeStrategySelect.selectOption({ index: i });
            await page.waitForTimeout(1000);
            const selectedValue = await mergeStrategySelect.inputValue();
            console.log(`🔄 Testing strategy: ${selectedValue}`);
            await takeScreenshot(page, `merge-07-strategy-${i}.png`, `Merge strategy option ${i + 1} selected`);
          }
        }

        // Look for conflict resolution options
        const conflictOptions = page.locator('.conflict-resolution, .merge-conflicts, input[name="conflict_resolution"]');
        if (await conflictOptions.count() > 0) {
          console.log('⚔️ Conflict resolution options found');
          await takeScreenshot(page, 'merge-08-conflict-resolution.png', 'Conflict resolution options available');
        }

        // Look for merge preview or details
        const mergePreview = page.locator('.merge-preview, .changes-preview, .merge-details, .affected-items');
        if (await mergePreview.count() > 0) {
          console.log('👁️ Merge preview/details found');
          await takeScreenshot(page, 'merge-09-merge-preview.png', 'Merge preview and affected items');
        }

        // Look for specific conflict items
        const conflicts = page.locator('.conflict-item, .merge-conflict, .conflicted-assignment');
        const conflictCount = await conflicts.count();
        if (conflictCount > 0) {
          console.log(`⚔️ Found ${conflictCount} specific conflicts to resolve`);
          await takeScreenshot(page, 'merge-10-specific-conflicts.png', 'Specific merge conflicts identified');
          
          // Try to interact with first conflict
          const firstConflict = conflicts.first();
          await firstConflict.click();
          await page.waitForTimeout(1000);
          await takeScreenshot(page, 'merge-11-conflict-details.png', 'Detailed view of specific conflict');
        }

        // Look for merge confirmation button
        const confirmMergeButton = page.locator('button:has-text("Confirm Merge"), button:has-text("Execute Merge"), button:has-text("Merge Now")').first();
        if (await confirmMergeButton.count() > 0) {
          console.log('✅ Merge confirmation button found');
          await takeScreenshot(page, 'merge-12-ready-to-confirm.png', 'Ready to confirm merge');
          
          // For demo, we'll cancel instead of actually executing
          const cancelButton = page.locator('button:has-text("Cancel"), .cancel-button').first();
          if (await cancelButton.count() > 0) {
            await cancelButton.click();
            console.log('📝 Merge cancelled for demo safety');
          } else {
            await page.press('Escape');
          }
        }
      }

      // Option 2: Navigate to merge page
      else if (await page.url().includes('merge')) {
        console.log('🌐 Navigated to dedicated merge page');
        await takeScreenshot(page, 'merge-05-merge-page.png', 'Dedicated merge page');
        
        // Look for merge interface elements
        await page.waitForTimeout(3000);
        await takeScreenshot(page, 'merge-06-merge-page-loaded.png', 'Merge page fully loaded');
        
        // Look for conflict resolution interface
        const conflictElements = await page.locator('.conflicts, .merge-conflicts, .conflict-resolution').count();
        if (conflictElements > 0) {
          console.log('⚔️ Conflict resolution interface found');
          await takeScreenshot(page, 'merge-07-conflict-interface.png', 'Conflict resolution interface');
        }
        
        // Navigate back
        await page.click('a[href="/scenarios"], nav a:has-text("Scenarios")');
        await page.waitForTimeout(2000);
      }

      // Option 3: Direct merge execution or other interface
      else {
        console.log('🔄 Direct merge execution or alternative interface');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'merge-05-direct-merge.png', 'Direct merge execution');
        
        // Check for any merge-related feedback
        const mergeElements = [
          '.merge-status',
          '.merge-result',
          '.merge-notification',
          '[data-testid="merge"]',
          '.merge-success',
          '.merge-error'
        ];
        
        for (const selector of mergeElements) {
          if (await page.locator(selector).count() > 0) {
            console.log(`📊 Found merge element: ${selector}`);
            await takeScreenshot(page, `merge-06-element-${selector.replace(/[^a-zA-Z0-9]/g, '')}.png`, `Merge element: ${selector}`);
          }
        }
      }
    } else {
      console.log('⚠️ No merge button found. Checking if merge functionality exists...');
      await takeScreenshot(page, 'merge-04-no-merge-button.png', 'No merge button found on scenario');
      
      // Check if it's because this isn't a child scenario
      const isChildScenario = await mergeableScenario.locator(':has-text("From"), :has-text("Branched")').count();
      if (isChildScenario === 0) {
        console.log('ℹ️ This appears to be a root scenario (no merge capability)');
      } else {
        console.log('⚠️ This is a child scenario but merge button not implemented or not visible');
      }
    }

    await takeScreenshot(page, 'merge-final-state.png', 'Final state after merge workflow testing');
    console.log('✅ Merge workflow analysis complete');
  });

  test('Deep Dive: Data Changes and Assignment Modifications', async ({ page }) => {
    console.log('📊 DEEP DIVE: Data Changes and Assignment Modifications in Scenarios');
    console.log('====================================================================');

    await loginAndNavigateToScenarios(page);
    
    // Create a working scenario
    console.log('\n📝 Step 1: Creating scenario for data modification testing...');
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Data Modification Test');
    await page.fill('textarea[id="scenario-description"]', 'Testing data changes within scenario context');
    await page.selectOption('select[id="scenario-type"]', 'branch');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'data-01-scenario-created.png', 'Scenario created for data testing');

    // Navigate to assignments to see scenario-specific data
    console.log('\n📋 Step 2: Viewing assignments in scenario context...');
    await page.click('a[href="/assignments"], nav a:has-text("Assignments")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'data-02-assignments-in-scenario.png', 'Assignments page in scenario context');

    // Look for scenario-specific assignments or data
    const assignmentCount = await page.locator('.assignment-row, .assignment-card, table tr').count();
    console.log(`📊 Found ${assignmentCount} assignments/rows in current view`);

    // Try to create an assignment within the scenario
    console.log('\n➕ Step 3: Creating assignment within scenario...');
    const newAssignmentButton = page.locator('button:has-text("New Assignment"), button:has-text("Add Assignment"), .add-assignment').first();
    
    if (await newAssignmentButton.count() > 0) {
      await newAssignmentButton.click();
      await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
      await takeScreenshot(page, 'data-03-assignment-modal.png', 'Assignment creation modal in scenario context');

      // Fill out assignment form to show scenario data modification
      const projectSelect = page.locator('select[name="project_id"], #project-select').first();
      if (await projectSelect.count() > 0) {
        const options = await projectSelect.locator('option').count();
        if (options > 1) {
          await projectSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          console.log('✅ Project selected for assignment');
        }
      }

      const personSelect = page.locator('select[name="person_id"], #person-select').first();
      if (await personSelect.count() > 0) {
        const options = await personSelect.locator('option').count();
        if (options > 1) {
          await personSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          console.log('✅ Person selected for assignment');
        }
      }

      const roleSelect = page.locator('select[name="role_id"], #role-select').first();
      if (await roleSelect.count() > 0) {
        const options = await roleSelect.locator('option').count();
        if (options > 1) {
          await roleSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          console.log('✅ Role selected for assignment');
        }
      }

      const allocationField = page.locator('input[name="allocation_percentage"], #allocation-percentage').first();
      if (await allocationField.count() > 0) {
        await allocationField.fill('80');
        await page.waitForTimeout(1000);
        console.log('✅ Allocation percentage set to 80%');
      }

      await takeScreenshot(page, 'data-04-assignment-filled.png', 'Assignment form completed (would create scenario-specific data)');

      // For demo, cancel instead of creating
      await page.keyboard.press('Escape');
      console.log('📝 Assignment creation cancelled for demo purposes');
    }

    // Navigate to projects to see scenario impact
    console.log('\n🏗️ Step 4: Viewing projects in scenario context...');
    await page.click('a[href="/projects"], nav a:has-text("Projects")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'data-05-projects-in-scenario.png', 'Projects page in scenario context');

    // Look for scenario-specific project modifications
    const projectCount = await page.locator('.project-row, .project-card, table tr').count();
    console.log(`🏗️ Found ${projectCount} projects/rows in current view`);

    // Return to scenarios to wrap up
    await page.click('a[href="/scenarios"], nav a:has-text("Scenarios")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'data-06-back-to-scenarios.png', 'Returned to scenarios overview');

    console.log('✅ Data modification workflow analysis complete');
  });
});