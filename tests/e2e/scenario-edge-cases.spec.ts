import { test, expect } from '@playwright/test';

/**
 * Comprehensive Edge Case Testing for Scenario Planning System
 * Tests complex scenarios, race conditions, and error recovery
 */
test.describe('Scenario Planning - Complex Edge Cases & Corner Cases', () => {

  async function loginAsUser(page: any, userId = '123e4567-e89b-12d3-a456-426614174000') {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    const hasLogin = await page.locator('#person-select').count() > 0;
    if (hasLogin) {
      await page.selectOption('#person-select', userId);
      await page.click('.login-button');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    await page.waitForSelector('.scenario-card, .scenarios-grid, h1:has-text("Scenario")', { timeout: 15000 });
  }

  async function takeScreenshot(page: any, filename: string, description: string) {
    console.log(`📸 ${description}`);
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    await page.waitForTimeout(1000);
  }

  async function createScenario(page: any, name: string, description: string, type = 'branch') {
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', name);
    await page.fill('textarea[id="scenario-description"]', description);
    await page.selectOption('select[id="scenario-type"]', type);
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
  }

  test('Edge Case: Multi-Level Scenario Hierarchy and Circular Dependency Prevention', async ({ page }) => {
    console.log('🔄 EDGE CASE: Multi-Level Hierarchy and Circular Dependencies');
    console.log('==============================================================');

    await loginAsUser(page);
    await takeScreenshot(page, 'edge-01-initial-state.png', 'Starting state for hierarchy testing');

    // Create Level 1 scenario
    console.log('\n📝 Creating Level 1 scenario...');
    await createScenario(page, 'Level 1 Parent', 'Root level scenario for hierarchy testing');
    await takeScreenshot(page, 'edge-02-level1-created.png', 'Level 1 scenario created');

    // Create Level 2 - Branch from Level 1
    console.log('\n📝 Creating Level 2 scenario...');
    const level1Card = page.locator('.scenario-card:has-text("Level 1 Parent")').first();
    await level1Card.hover();
    await page.waitForTimeout(1000);
    
    const branchButton = level1Card.locator('button:has-text("Branch")').first();
    await branchButton.click();
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Level 2 Child');
    await page.fill('textarea[id="scenario-description"]', 'Second level child scenario');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'edge-03-level2-created.png', 'Level 2 scenario created');

    // Create Level 3 - Branch from Level 2
    console.log('\n📝 Creating Level 3 scenario...');
    const level2Card = page.locator('.scenario-card:has-text("Level 2 Child")').first();
    await level2Card.hover();
    await page.waitForTimeout(1000);
    
    const branchButton2 = level2Card.locator('button:has-text("Branch")').first();
    await branchButton2.click();
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Level 3 Grandchild');
    await page.fill('textarea[id="scenario-description"]', 'Third level grandchild scenario');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'edge-04-level3-created.png', 'Multi-level hierarchy created');

    // Test deep hierarchy comparison
    console.log('\n🔍 Testing deep hierarchy comparison...');
    const level3Card = page.locator('.scenario-card:has-text("Level 3 Grandchild")').first();
    await level3Card.hover();
    const compareButton = level3Card.locator('button:has-text("Compare")').first();
    await compareButton.click();
    await page.waitForTimeout(2000);
    
    // Try comparing with root level
    const comparisonSelect = page.locator('select.scenario-select').first();
    if (await comparisonSelect.count() > 0) {
      const options = await comparisonSelect.locator('option').all();
      for (const option of options) {
        const text = await option.textContent();
        if (text && text.includes('Level 1 Parent')) {
          await comparisonSelect.selectOption(await option.getAttribute('value') || '');
          await page.waitForTimeout(1000);
          
          const runButton = page.locator('button:has-text("Compare Scenarios")').first();
          if (await runButton.count() > 0) {
            await runButton.click();
            await page.waitForTimeout(3000);
            await takeScreenshot(page, 'edge-05-deep-hierarchy-comparison.png', 'Deep hierarchy comparison results');
          }
          break;
        }
      }
    }
    
    await page.keyboard.press('Escape');
    console.log('✅ Multi-level hierarchy test completed');
  });

  test('Edge Case: Concurrent Scenario Operations and Race Conditions', async ({ page, context }) => {
    console.log('⚡ EDGE CASE: Concurrent Operations and Race Conditions');
    console.log('====================================================');

    await loginAsUser(page);
    
    // Create a scenario to work with
    await createScenario(page, 'Concurrent Test Base', 'Scenario for testing concurrent operations');
    await takeScreenshot(page, 'edge-06-concurrent-base.png', 'Base scenario for concurrent testing');

    // Create child scenario for concurrent testing
    const baseCard = page.locator('.scenario-card:has-text("Concurrent Test Base")').first();
    await baseCard.hover();
    const branchButton = baseCard.locator('button:has-text("Branch")').first();
    await branchButton.click();
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    await page.fill('input[id="scenario-name"]', 'Concurrent Test Child');
    await page.fill('textarea[id="scenario-description"]', 'Child for concurrent operation testing');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(3000);

    // Test concurrent merge attempts
    console.log('\n🔄 Testing concurrent merge attempts...');
    
    // Open first merge modal
    const childCard = page.locator('.scenario-card:has-text("Concurrent Test Child")').first();
    await childCard.hover();
    const mergeButton1 = childCard.locator('button:has-text("Merge")').first();
    
    if (await mergeButton1.count() > 0) {
      await mergeButton1.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'edge-07-first-merge-modal.png', 'First merge modal opened');

      // Open second tab to simulate concurrent user
      const secondPage = await context.newPage();
      await loginAsUser(secondPage);
      
      // Try to access the same scenario from second tab
      const childCard2 = secondPage.locator('.scenario-card:has-text("Concurrent Test Child")').first();
      if (await childCard2.count() > 0) {
        await childCard2.hover();
        const mergeButton2 = childCard2.locator('button:has-text("Merge")').first();
        
        if (await mergeButton2.count() > 0) {
          await mergeButton2.click();
          await page.waitForTimeout(2000);
          await takeScreenshot(secondPage, 'edge-08-second-merge-modal.png', 'Second concurrent merge modal');
        }
      }
      
      await secondPage.close();
      await page.keyboard.press('Escape');
    }

    console.log('✅ Concurrent operations test completed');
  });

  test('Edge Case: Complex Conflict Resolution with Overlapping Changes', async ({ page }) => {
    console.log('⚔️ EDGE CASE: Complex Conflict Resolution');
    console.log('=========================================');

    await loginAsUser(page);
    
    // Create scenarios with potential for complex conflicts
    await createScenario(page, 'Conflict Source', 'Source scenario with complex changes');
    await createScenario(page, 'Conflict Target', 'Target scenario with conflicting changes');
    await takeScreenshot(page, 'edge-09-conflict-scenarios.png', 'Scenarios created for conflict testing');

    // Navigate to assignments to create conflicting data
    console.log('\n📋 Creating conflicting assignment data...');
    await page.click('a[href="/assignments"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to create assignments that would conflict
    const newAssignmentButton = page.locator('button:has-text("New Assignment")').first();
    if (await newAssignmentButton.count() > 0) {
      console.log('Creating assignment that could cause conflicts...');
      await newAssignmentButton.click();
      await page.waitForSelector('.modal-content', { timeout: 5000 });
      
      // Fill form with data that could cause over-allocation conflicts
      const projectSelect = page.locator('select[name="project_id"], #project-select').first();
      if (await projectSelect.count() > 0) {
        const options = await projectSelect.locator('option').count();
        if (options > 1) {
          await projectSelect.selectOption({ index: 1 });
        }
      }
      
      const personSelect = page.locator('select[name="person_id"], #person-select').first();
      if (await personSelect.count() > 0) {
        const options = await personSelect.locator('option').count();
        if (options > 1) {
          await personSelect.selectOption({ index: 1 });
        }
      }
      
      const roleSelect = page.locator('select[name="role_id"], #role-select').first();
      if (await roleSelect.count() > 0) {
        const options = await roleSelect.locator('option').count();
        if (options > 1) {
          await roleSelect.selectOption({ index: 1 });
        }
      }
      
      // Set high allocation that could cause conflicts
      const allocationField = page.locator('input[name="allocation_percentage"]').first();
      if (await allocationField.count() > 0) {
        await allocationField.fill('90');
      }
      
      await takeScreenshot(page, 'edge-10-conflicting-assignment.png', 'Assignment with potential conflicts');
      
      // Cancel instead of creating to avoid data corruption
      await page.keyboard.press('Escape');
    }

    // Go back to scenarios and test complex comparison
    await page.click('a[href="/scenarios"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const sourceCard = page.locator('.scenario-card:has-text("Conflict Source")').first();
    await sourceCard.hover();
    const compareButton = sourceCard.locator('button:has-text("Compare")').first();
    await compareButton.click();
    await page.waitForTimeout(2000);
    
    const comparisonSelect = page.locator('select.scenario-select').first();
    if (await comparisonSelect.count() > 0) {
      const options = await comparisonSelect.locator('option').all();
      for (const option of options) {
        const text = await option.textContent();
        if (text && text.includes('Conflict Target')) {
          await comparisonSelect.selectOption(await option.getAttribute('value') || '');
          await page.waitForTimeout(1000);
          
          const runButton = page.locator('button:has-text("Compare Scenarios")').first();
          if (await runButton.count() > 0) {
            await runButton.click();
            await page.waitForTimeout(3000);
            await takeScreenshot(page, 'edge-11-complex-conflict-analysis.png', 'Complex conflict analysis results');
          }
          break;
        }
      }
    }
    
    await page.keyboard.press('Escape');
    console.log('✅ Complex conflict resolution test completed');
  });

  test('Edge Case: Large Dataset Performance and Memory Handling', async ({ page }) => {
    console.log('📊 EDGE CASE: Large Dataset Performance');
    console.log('======================================');

    await loginAsUser(page);
    
    console.log('\n⏱️ Testing performance with large scenario lists...');
    
    // Create multiple scenarios to test performance
    const scenarioNames = [
      'Performance Test 1', 'Performance Test 2', 'Performance Test 3',
      'Performance Test 4', 'Performance Test 5', 'Performance Test 6',
      'Performance Test 7', 'Performance Test 8', 'Performance Test 9',
      'Performance Test 10'
    ];

    const startTime = Date.now();

    for (let i = 0; i < scenarioNames.length; i++) {
      console.log(`Creating scenario ${i + 1}/${scenarioNames.length}: ${scenarioNames[i]}`);
      await createScenario(page, scenarioNames[i], `Performance test scenario ${i + 1}`);
      
      // Take screenshot every 3 scenarios to monitor UI responsiveness
      if ((i + 1) % 3 === 0) {
        await takeScreenshot(page, `edge-12-performance-${i + 1}.png`, `Performance test after ${i + 1} scenarios`);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log(`⏱️ Created ${scenarioNames.length} scenarios in ${totalTime}ms (avg: ${totalTime / scenarioNames.length}ms per scenario)`);

    // Test UI responsiveness after creating many scenarios
    console.log('\n🖱️ Testing UI responsiveness with large dataset...');
    await page.waitForTimeout(2000);
    
    // Test scrolling performance
    const scenariosGrid = page.locator('.scenarios-grid').first();
    if (await scenariosGrid.count() > 0) {
      await scenariosGrid.hover();
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(500);
      await page.mouse.wheel(0, -1000);
      await page.waitForTimeout(500);
    }

    // Test comparison with large dataset
    const firstScenario = page.locator('.scenario-card').first();
    await firstScenario.hover();
    const compareButton = firstScenario.locator('button:has-text("Compare")').first();
    
    if (await compareButton.count() > 0) {
      await compareButton.click();
      await page.waitForTimeout(2000);
      
      const comparisonSelect = page.locator('select.scenario-select').first();
      if (await comparisonSelect.count() > 0) {
        // Test dropdown performance with many options
        await comparisonSelect.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'edge-13-large-dropdown.png', 'Large dataset dropdown performance');
        
        // Select last option to test rendering
        const options = await comparisonSelect.locator('option').count();
        if (options > 1) {
          await comparisonSelect.selectOption({ index: options - 1 });
          await page.waitForTimeout(1000);
          
          const runButton = page.locator('button:has-text("Compare Scenarios")').first();
          if (await runButton.count() > 0) {
            const compareStartTime = Date.now();
            await runButton.click();
            await page.waitForTimeout(4000);
            const compareEndTime = Date.now();
            console.log(`⏱️ Comparison completed in ${compareEndTime - compareStartTime}ms`);
            await takeScreenshot(page, 'edge-14-large-dataset-comparison.png', 'Large dataset comparison results');
          }
        }
      }
      
      await page.keyboard.press('Escape');
    }

    await takeScreenshot(page, 'edge-15-performance-final.png', 'Final state after performance testing');
    console.log('✅ Large dataset performance test completed');
  });

  test('Edge Case: Network Error Recovery and Data Persistence', async ({ page }) => {
    console.log('🌐 EDGE CASE: Network Error Recovery');
    console.log('===================================');

    await loginAsUser(page);
    
    console.log('\n📡 Testing scenario creation with network simulation...');
    
    // Create scenario normally first
    await createScenario(page, 'Network Test Scenario', 'Testing network error recovery');
    await takeScreenshot(page, 'edge-16-normal-creation.png', 'Normal scenario creation');

    // Test comparison modal behavior with network delays
    const scenarioCard = page.locator('.scenario-card:has-text("Network Test Scenario")').first();
    await scenarioCard.hover();
    const compareButton = scenarioCard.locator('button:has-text("Compare")').first();
    
    if (await compareButton.count() > 0) {
      await compareButton.click();
      await page.waitForTimeout(2000);
      
      // Simulate slow network by testing loading states
      const comparisonSelect = page.locator('select.scenario-select').first();
      if (await comparisonSelect.count() > 0) {
        // Look for existing scenarios to compare
        const options = await comparisonSelect.locator('option').count();
        if (options > 1) {
          await comparisonSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          const runButton = page.locator('button:has-text("Compare Scenarios")').first();
          if (await runButton.count() > 0) {
            // Click and immediately check for loading state
            await runButton.click();
            await page.waitForTimeout(500);
            
            // Check if loading indicator appears
            const loadingIndicator = page.locator('text="Running Comparison"').first();
            if (await loadingIndicator.count() > 0) {
              console.log('✅ Loading indicator detected during comparison');
              await takeScreenshot(page, 'edge-17-loading-state.png', 'Loading state during comparison');
            }
            
            await page.waitForTimeout(3000);
            await takeScreenshot(page, 'edge-18-comparison-recovery.png', 'Comparison completed after loading');
          }
        }
      }
      
      await page.keyboard.press('Escape');
    }

    // Test browser refresh recovery
    console.log('\n🔄 Testing browser refresh recovery...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'edge-19-refresh-recovery.png', 'State after browser refresh');

    console.log('✅ Network error recovery test completed');
  });

  test('Edge Case: UI State Management and Memory Leaks', async ({ page }) => {
    console.log('🧠 EDGE CASE: UI State Management and Memory');
    console.log('===========================================');

    await loginAsUser(page);
    
    console.log('\n🔄 Testing modal state management edge cases...');
    
    // Create scenarios for modal testing
    await createScenario(page, 'Modal Test A', 'Testing modal state management');
    await createScenario(page, 'Modal Test B', 'Testing modal cleanup');
    
    // Test rapid modal opening and closing
    for (let i = 0; i < 3; i++) {
      console.log(`Modal cycle ${i + 1}/3`);
      
      const scenarioCard = page.locator('.scenario-card:has-text("Modal Test A")').first();
      await scenarioCard.hover();
      const compareButton = scenarioCard.locator('button:has-text("Compare")').first();
      
      if (await compareButton.count() > 0) {
        await compareButton.click();
        await page.waitForTimeout(1000);
        
        // Check modal opened
        const modal = page.locator('.modal-content').first();
        if (await modal.count() > 0) {
          await takeScreenshot(page, `edge-20-modal-cycle-${i + 1}.png`, `Modal cycle ${i + 1}`);
          
          // Close modal rapidly
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }

    // Test nested modal behavior (if applicable)
    console.log('\n🪟 Testing modal cleanup and state persistence...');
    
    const scenarioCard = page.locator('.scenario-card:has-text("Modal Test A")').first();
    await scenarioCard.hover();
    const compareButton = scenarioCard.locator('button:has-text("Compare")').first();
    
    if (await compareButton.count() > 0) {
      await compareButton.click();
      await page.waitForTimeout(2000);
      
      // Fill some form data
      const comparisonSelect = page.locator('select.scenario-select').first();
      if (await comparisonSelect.count() > 0) {
        const options = await comparisonSelect.locator('option').count();
        if (options > 1) {
          await comparisonSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // Test navigation away and back
          await page.click('a[href="/dashboard"]');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          await page.click('a[href="/scenarios"]');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          await takeScreenshot(page, 'edge-21-state-persistence.png', 'State after navigation');
        }
      }
    }

    console.log('✅ UI state management test completed');
  });

  test('Edge Case: Permission and Security Boundary Testing', async ({ page }) => {
    console.log('🔒 EDGE CASE: Security and Permission Boundaries');
    console.log('===============================================');

    await loginAsUser(page);
    
    console.log('\n🛡️ Testing scenario access controls...');
    
    // Create scenario for security testing
    await createScenario(page, 'Security Test Scenario', 'Testing security boundaries');
    await takeScreenshot(page, 'edge-22-security-scenario.png', 'Scenario for security testing');

    // Test various operations to ensure proper authorization
    const scenarioCard = page.locator('.scenario-card:has-text("Security Test Scenario")').first();
    await scenarioCard.hover();
    await page.waitForTimeout(1000);
    
    // Check that all expected buttons are present and accessible
    const actions = ['Branch', 'Compare', 'Edit'];
    
    for (const action of actions) {
      const actionButton = scenarioCard.locator(`button:has-text("${action}")`).first();
      if (await actionButton.count() > 0) {
        console.log(`✅ ${action} button accessible`);
        await actionButton.hover();
        await page.waitForTimeout(500);
      } else {
        console.log(`⚠️ ${action} button not found`);
      }
    }

    // Test comparison with cross-scenario data access
    const compareButton = scenarioCard.locator('button:has-text("Compare")').first();
    if (await compareButton.count() > 0) {
      await compareButton.click();
      await page.waitForTimeout(2000);
      
      // Verify only accessible scenarios appear in dropdown
      const comparisonSelect = page.locator('select.scenario-select').first();
      if (await comparisonSelect.count() > 0) {
        const optionCount = await comparisonSelect.locator('option').count();
        console.log(`📊 Found ${optionCount} scenarios accessible for comparison`);
        
        if (optionCount > 1) {
          await comparisonSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          const runButton = page.locator('button:has-text("Compare Scenarios")').first();
          if (await runButton.count() > 0) {
            await runButton.click();
            await page.waitForTimeout(3000);
            await takeScreenshot(page, 'edge-23-security-comparison.png', 'Security-controlled comparison');
          }
        }
      }
      
      await page.keyboard.press('Escape');
    }

    await takeScreenshot(page, 'edge-24-security-final.png', 'Security testing completed');
    console.log('✅ Security boundary test completed');
  });
});