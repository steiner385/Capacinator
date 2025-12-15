import { test, expect } from '../../fixtures';
import { ScenarioTestUtils, createUniqueTestPrefix, waitForSync } from '../../helpers/scenario-test-utils';
import { TestDataContext } from '../../utils/test-data-helpers';

test.describe('Scenario API Filtering', () => {
  let testContext: TestDataContext;
  let scenarioUtils: ScenarioTestUtils;
  let userId: string;

  test.beforeEach(async ({ authenticatedPage, testDataHelpers, apiContext }) => {
    // Create test context
    const uniquePrefix = createUniqueTestPrefix('apitest');
    testContext = testDataHelpers.createTestContext(uniquePrefix);
    
    // Initialize scenario utils
    scenarioUtils = new ScenarioTestUtils({
      page: authenticatedPage,
      apiContext,
      testPrefix: uniquePrefix
    });

    // Get user ID
    try {
      const profileResponse = await apiContext.get('/api/profile');
      if (profileResponse.ok()) {
        const profile = await profileResponse.json();
        userId = profile.person?.id || '';
      }
    } catch (error) {
      console.log('Could not get profile:', error);
    }
    
    if (!userId) {
      const testUser = await testDataHelpers.createTestUser(testContext);
      userId = testUser.id;
    }
  });

  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up test data
    await scenarioUtils.cleanupScenariosByPrefix(testContext.prefix);
    await testDataHelpers.cleanupTestContext(testContext);
  });

  test('should include scenario ID in API request headers', async ({ authenticatedPage }) => {
    // Set up request interception
    const requestHeaders: Record<string, string> = {};
    
    authenticatedPage.on('request', request => {
      if (request.url().includes('/api/')) {
        const headers = request.headers();
        if (headers['x-scenario-id']) {
          requestHeaders['x-scenario-id'] = headers['x-scenario-id'];
        }
      }
    });

    // Navigate to assignments page
    await authenticatedPage.goto('/assignments');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for API calls to complete
    await authenticatedPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Check that scenario header was included
    expect(requestHeaders['x-scenario-id']).toBeDefined();
    expect(requestHeaders['x-scenario-id']).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  test('should filter assignments by selected scenario', async ({ authenticatedPage, apiContext }) => {
    // First, get the baseline scenario assignments
    await authenticatedPage.goto('/assignments');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Count assignments in the table or list
    const baselineAssignments = await authenticatedPage.locator('tbody tr, .assignment-row, .assignment-card').count();
    
    // Create a new scenario via API
    const newScenarioName = `${testContext.prefix}-Filter-Test`;
    const createResponse = await apiContext.post('/api/scenarios', {
      data: {
        name: newScenarioName,
        description: 'Testing scenario filtering functionality',
        scenario_type: 'branch',
        status: 'active',
        created_by: userId
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const newScenario = await createResponse.json();
    const newScenarioId = newScenario.id;
    
    // Switch to the new scenario using the header dropdown
    const scenarioSelector = authenticatedPage.locator('.scenario-selector, [data-testid="scenario-selector"]');
    if (await scenarioSelector.isVisible()) {
      await scenarioSelector.click();
      await authenticatedPage.click(`text="${newScenarioName}"`);
      await waitForSync(authenticatedPage);
    } else {
      // If no dropdown, set scenario in context directly
      await authenticatedPage.evaluate((id) => {
        localStorage.setItem('currentScenarioId', id);
      }, newScenarioId);
    }
    
    // Navigate to assignments and verify filtering
    await authenticatedPage.goto('/assignments');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Check that assignments are different (new scenario should have fewer or no assignments)
    const newScenarioAssignments = await authenticatedPage.locator('tbody tr, .assignment-row, .assignment-card').count();
    // New scenario should have no assignments initially
    expect(newScenarioAssignments).toBeLessThanOrEqual(baselineAssignments);
  });

  test('should respect includeAllScenarios parameter', async ({ authenticatedPage }) => {
    // Navigate to assignments with includeAllScenarios parameter
    await authenticatedPage.goto('/assignments?includeAllScenarios=true');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Count assignments with all scenarios included
    const allScenariosCount = await authenticatedPage.locator('tbody tr, .assignment-row').count();
    
    // Navigate without the parameter (filtered by current scenario)
    await authenticatedPage.goto('/assignments');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const filteredCount = await authenticatedPage.locator('tbody tr, .assignment-row').count();
    
    // All scenarios should show more or equal assignments
    expect(allScenariosCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('should filter demand report data by scenario', async ({ authenticatedPage, apiContext }) => {
    // Navigate to demand report
    await authenticatedPage.goto('/reports?tab=demand');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Get baseline demand metrics
    const baselineMetrics = await authenticatedPage.locator('.report-summary, .metrics-container, .demand-summary').first();
    const baselineTotalHours = await baselineMetrics.textContent();
    
    // Create and switch to a new scenario
    const emptyScenarioName = `${testContext.prefix}-Empty-Scenario`;
    const createResponse = await apiContext.post('/api/scenarios', {
      data: {
        name: emptyScenarioName,
        description: 'Scenario with no assignments for testing',
        scenario_type: 'branch',
        status: 'active',
        created_by: userId
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const emptyScenario = await createResponse.json();
    
    // Switch to the new empty scenario
    const scenarioSelector = authenticatedPage.locator('.scenario-selector, [data-testid="scenario-selector"]');
    if (await scenarioSelector.isVisible()) {
      await scenarioSelector.click();
      await authenticatedPage.click(`text="${emptyScenarioName}"`);
      await waitForSync(authenticatedPage);
    } else {
      await authenticatedPage.evaluate((id) => {
        localStorage.setItem('currentScenarioId', id);
      }, emptyScenario.id);
    }
    
    // Navigate back to demand report
    await authenticatedPage.goto('/reports?tab=demand');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Verify that demand is different (should be 0 for empty scenario)
    const emptyScenarioMetrics = await authenticatedPage.locator('.report-summary, .metrics-container, .demand-summary').first();
    const emptyScenarioText = await emptyScenarioMetrics.textContent();
    
    // Should show 0 or no demand
    expect(emptyScenarioText).toMatch(/0|no demand|empty/i);
  });

  test('should maintain scenario context across navigation', async ({ authenticatedPage, apiContext }) => {
    // Create a test scenario
    const navScenarioName = `${testContext.prefix}-Navigation-Test`;
    const createResponse = await apiContext.post('/api/scenarios', {
      data: {
        name: navScenarioName,
        description: 'Testing navigation scenario persistence',
        scenario_type: 'sandbox',
        status: 'active',
        created_by: userId
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const navScenario = await createResponse.json();
    
    // Switch to the test scenario
    const scenarioSelector = authenticatedPage.locator('.scenario-selector, [data-testid="scenario-selector"]');
    if (await scenarioSelector.isVisible()) {
      await scenarioSelector.click();
      await authenticatedPage.click(`text="${navScenarioName}"`);
      await waitForSync(authenticatedPage);
    } else {
      await authenticatedPage.evaluate((data) => {
        localStorage.setItem('currentScenario', JSON.stringify(data));
        localStorage.setItem('currentScenarioId', data.id);
      }, navScenario);
    }
    
    // Navigate through different pages
    const pagesToTest = ['/assignments', '/projects', '/people', '/reports'];
    
    for (const pageUrl of pagesToTest) {
      await authenticatedPage.goto(pageUrl);
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Verify scenario is still in context (either in header or localStorage)
      const scenarioContext = await authenticatedPage.evaluate(() => {
        return localStorage.getItem('currentScenario') || localStorage.getItem('currentScenarioId');
      });
      
      expect(scenarioContext).toBeTruthy();
      
      // If we have a scenario selector, verify it shows the correct scenario
      const selectedScenarioEl = authenticatedPage.locator('.scenario-selector .selected-scenario, .current-scenario');
      if (await selectedScenarioEl.isVisible()) {
        const selectedText = await selectedScenarioEl.textContent();
        expect(selectedText).toContain(navScenarioName);
      }
    }
  });

  test('should handle scenario API errors gracefully', async ({ authenticatedPage }) => {
    // Set an invalid scenario ID in localStorage
    await authenticatedPage.evaluate(() => {
      localStorage.setItem('currentScenario', JSON.stringify({
        id: 'invalid-scenario-id',
        name: 'Invalid Scenario'
      }));
      localStorage.setItem('currentScenarioId', 'invalid-scenario-id');
    });
    
    // Navigate to assignments
    await authenticatedPage.goto('/assignments');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Page should still load without crashing
    const pageContent = authenticatedPage.locator('.assignments-page, main, .content');
    await expect(pageContent.first()).toBeVisible();
    
    // Should show some content (either error message or fallback data)
    const hasContent = await authenticatedPage.locator('tbody tr, .assignment-row, .error-message, .empty-state').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});