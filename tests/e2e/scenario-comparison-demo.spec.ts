import { test, expect } from '@playwright/test';

/**
 * Comprehensive test of the new detailed scenario comparison and merge interfaces
 * This test creates scenarios, makes modifications, and demonstrates the detailed workflows
 */
test.describe('Scenario Comparison and Merge: Full Workflow Demo', () => {

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

    await page.waitForSelector('.scenario-card, .scenarios-grid, h1:has-text(\"Scenario\")', { timeout: 15000 });
  }

  async function takeScreenshot(page: any, filename: string, description: string) {
    console.log(`📸 ${description}`);
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    await page.waitForTimeout(1500);
  }

  test('Full Workflow: Detailed Comparison Interface', async ({ page }) => {
    console.log('🔍 FULL WORKFLOW: Detailed Scenario Comparison Interface');
    console.log('=====================================================');

    await loginAndNavigateToScenarios(page);
    await takeScreenshot(page, 'full-01-scenarios-page.png', 'Starting: Scenarios overview page');

    // Step 1: Create base scenario for comparison
    console.log('\n📝 Step 1: Creating base scenario for comparison...');
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Comparison Demo Base');
    await page.fill('textarea[id="scenario-description"]', 'Base scenario for demonstrating detailed comparison features');
    await page.selectOption('select[id="scenario-type"]', 'branch');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'full-02-base-scenario-created.png', 'Base scenario created');

    // Step 2: Create comparison scenario
    console.log('\n📝 Step 2: Creating comparison scenario...');
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Comparison Demo Target');
    await page.fill('textarea[id="scenario-description"]', 'Target scenario for comparison demonstration');
    await page.selectOption('select[id="scenario-type"]', 'branch');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'full-03-target-scenario-created.png', 'Target scenario created');

    // Step 3: Initiate detailed comparison
    console.log('\n🔍 Step 3: Testing detailed comparison interface...');
    const baseScenario = page.locator('.scenario-card:has-text("Comparison Demo Base")').first();
    await baseScenario.hover();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'full-04-hover-comparison-actions.png', 'Comparison actions revealed on hover');

    const compareButton = baseScenario.locator('button:has-text("Compare")').first();
    await compareButton.click();
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'full-05-comparison-modal-opened.png', 'Detailed comparison modal opened');

    // Step 4: Select comparison target
    console.log('\n🎯 Step 4: Selecting comparison target...');
    const comparisonSelect = page.locator('select.scenario-select').first();
    
    if (await comparisonSelect.count() > 0) {
      // Look for our target scenario in the dropdown
      const options = await comparisonSelect.locator('option').all();
      let targetFound = false;
      
      for (const option of options) {
        const text = await option.textContent();
        if (text && text.includes('Comparison Demo Target')) {
          await comparisonSelect.selectOption(await option.getAttribute('value') || '');
          targetFound = true;
          break;
        }
      }
      
      if (targetFound) {
        console.log('✅ Target scenario selected for comparison');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'full-06-target-selected.png', 'Target scenario selected');

        // Step 5: Execute comparison
        console.log('\n🚀 Step 5: Running detailed comparison...');
        const runComparisonButton = page.locator('button:has-text("Compare Scenarios")').first();
        if (await runComparisonButton.count() > 0) {
          await runComparisonButton.click();
          await page.waitForTimeout(4000);
          await takeScreenshot(page, 'full-07-comparison-results.png', 'Detailed comparison results displayed');

          // Step 6: Explore comparison tabs
          console.log('\n📊 Step 6: Exploring comparison result tabs...');
          
          // Check assignments tab
          const assignmentsTab = page.locator('button.tab-button:has-text("Assignments")').first();
          if (await assignmentsTab.count() > 0) {
            await assignmentsTab.click();
            await page.waitForTimeout(2000);
            await takeScreenshot(page, 'full-08-assignments-comparison.png', 'Assignments comparison view');
          }

          // Check metrics tab
          const metricsTab = page.locator('button.tab-button:has-text("Impact Analysis")').first();
          if (await metricsTab.count() > 0) {
            await metricsTab.click();
            await page.waitForTimeout(2000);
            await takeScreenshot(page, 'full-09-metrics-analysis.png', 'Impact analysis and metrics view');
          }

          // Check phases tab
          const phasesTab = page.locator('button.tab-button:has-text("Phases")').first();
          if (await phasesTab.count() > 0) {
            await phasesTab.click();
            await page.waitForTimeout(2000);
            await takeScreenshot(page, 'full-10-phases-comparison.png', 'Phases comparison view');
          }

          // Check projects tab
          const projectsTab = page.locator('button.tab-button:has-text("Projects")').first();
          if (await projectsTab.count() > 0) {
            await projectsTab.click();
            await page.waitForTimeout(2000);
            await takeScreenshot(page, 'full-11-projects-comparison.png', 'Projects comparison view');
          }

          console.log('✅ Successfully explored all comparison tabs');
        }
      } else {
        console.log('⚠️ Target scenario not found in dropdown');
      }
    }

    // Step 7: Close and test new comparison
    console.log('\n🔄 Step 7: Testing new comparison workflow...');
    const newComparisonButton = page.locator('button:has-text("New Comparison")').first();
    if (await newComparisonButton.count() > 0) {
      await newComparisonButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'full-12-new-comparison-setup.png', 'New comparison setup');
    }

    // Close modal
    const closeButton = page.locator('button:has-text("Close")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await takeScreenshot(page, 'full-13-comparison-complete.png', 'Comparison workflow completed');
    console.log('✅ Detailed comparison interface testing complete');
  });

  test('Full Workflow: Detailed Merge Interface', async ({ page }) => {
    console.log('🔄 FULL WORKFLOW: Detailed Scenario Merge Interface');
    console.log('================================================');

    await loginAndNavigateToScenarios(page);
    await takeScreenshot(page, 'merge-01-scenarios-page.png', 'Starting: Scenarios overview for merge testing');

    // Step 1: Create parent scenario for merge testing
    console.log('\n📝 Step 1: Creating parent scenario...');
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Merge Demo Parent');
    await page.fill('textarea[id="scenario-description"]', 'Parent scenario for merge demonstration');
    await page.selectOption('select[id="scenario-type"]', 'branch');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);

    // Step 2: Create child scenario by branching
    console.log('\n🌿 Step 2: Creating child scenario via branching...');
    const parentCard = page.locator('.scenario-card:has-text("Merge Demo Parent")').first();
    await parentCard.hover();
    await page.waitForTimeout(1000);
    
    const branchButton = parentCard.locator('button:has-text("Branch")').first();
    await branchButton.click();
    await page.waitForSelector('[role="dialog"] > div', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Merge Demo Child');
    await page.fill('textarea[id="scenario-description"]', 'Child scenario that will demonstrate merge workflow');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'merge-02-parent-child-created.png', 'Parent and child scenarios created');

    // Step 3: Test merge workflow on child scenario
    console.log('\n🔄 Step 3: Testing detailed merge workflow...');
    const childCard = page.locator('.scenario-card:has-text("Merge Demo Child")').first();
    await childCard.hover();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'merge-03-child-hover-actions.png', 'Child scenario with merge actions revealed');

    const mergeButton = childCard.locator('button:has-text("Merge")').first();
    
    if (await mergeButton.count() > 0) {
      await mergeButton.click();
      await page.waitForTimeout(3000);
      await takeScreenshot(page, 'merge-04-merge-modal-opened.png', 'Detailed merge modal opened');

      // Step 4: Test merge strategy selection
      console.log('\n⚙️ Step 4: Testing merge strategy options...');
      
      // Test manual resolution strategy
      const manualStrategy = page.locator('input[value="manual"]').first();
      if (await manualStrategy.count() > 0) {
        await manualStrategy.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'merge-05-manual-strategy.png', 'Manual resolution strategy selected');
      }

      // Test source priority strategy
      const sourceStrategy = page.locator('input[value="use_source"]').first();
      if (await sourceStrategy.count() > 0) {
        await sourceStrategy.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'merge-06-source-strategy.png', 'Source priority strategy selected');
      }

      // Test target priority strategy
      const targetStrategy = page.locator('input[value="use_target"]').first();
      if (await targetStrategy.count() > 0) {
        await targetStrategy.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'merge-07-target-strategy.png', 'Target priority strategy selected');
      }

      // Step 5: Initiate merge analysis
      console.log('\n🔍 Step 5: Testing merge conflict analysis...');
      const analyzeButton = page.locator('button:has-text("Analyze Conflicts")').first();
      if (await analyzeButton.count() > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(4000);
        await takeScreenshot(page, 'merge-08-conflict-analysis.png', 'Merge conflict analysis results');

        // Check if conflict resolution interface appears
        const conflictHeader = page.locator('h3:has-text("Resolve Merge Conflicts")').first();
        if (await conflictHeader.count() > 0) {
          console.log('⚔️ Conflict resolution interface detected');
          await takeScreenshot(page, 'merge-09-conflict-resolution.png', 'Conflict resolution interface');

          // Test conflict navigation if conflicts exist
          const nextButton = page.locator('button:has-text("Next")').first();
          if (await nextButton.count() > 0 && !await nextButton.isDisabled()) {
            await nextButton.click();
            await page.waitForTimeout(1000);
            await takeScreenshot(page, 'merge-10-next-conflict.png', 'Next conflict in resolution workflow');
          }

          // Test resolution button
          const previewButton = page.locator('button:has-text("Preview Merge")').first();
          if (await previewButton.count() > 0) {
            await previewButton.click();
            await page.waitForTimeout(2000);
            await takeScreenshot(page, 'merge-11-merge-preview.png', 'Merge preview interface');
          }
        } else {
          console.log('✅ No conflicts detected - direct merge possible');
          const executeButton = page.locator('button:has-text("Execute Merge")').first();
          if (await executeButton.count() > 0) {
            // For demo purposes, we'll cancel instead of executing
            const cancelButton = page.locator('button:has-text("Cancel")').first();
            if (await cancelButton.count() > 0) {
              await takeScreenshot(page, 'merge-11-ready-to-execute.png', 'Ready to execute merge (demo cancelled)');
              await cancelButton.click();
            }
          }
        }
      }

      // Close modal if still open
      const closeButton = page.locator('button:has-text("Close")').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('⚠️ Merge button not found - checking scenario hierarchy');
      await takeScreenshot(page, 'merge-04-no-merge-button.png', 'Merge button not found');
    }

    await takeScreenshot(page, 'merge-12-merge-workflow-complete.png', 'Merge workflow testing completed');
    console.log('✅ Detailed merge interface testing complete');
  });
});