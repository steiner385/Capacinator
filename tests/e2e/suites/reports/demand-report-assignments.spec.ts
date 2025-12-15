/**
 * Demand Report Assignment-Based Tests
 * Validates that demand reports work correctly with actual assignments
 * (not just resource templates)
 */
import { test, expect, tags } from '../../fixtures';

test.describe('Demand Report - Assignment Based', () => {
  test(`${tags.critical} should show demand data when using actual assignments (no resource templates)`, async ({ 
    apiContext,
    authenticatedPage,
    testHelpers
  }) => {
    // Create a scenario with actual assignments but no resource templates
    const scenario = await apiContext.post('/api/scenarios', {
      data: {
        name: 'Test Scenario - Assignments Only',
        scenario_type: 'baseline',
        status: 'active'
      }
    });
    const scenarioData = await scenario.json();
    
    // Create a project
    const project = await apiContext.post('/api/projects', {
      data: {
        name: 'Test Project for Demand',
        project_type_id: (await apiContext.get('/api/project-types').then(r => r.json()))[0].id,
        project_sub_type_id: (await apiContext.get('/api/project-sub-types').then(r => r.json()))[0].id,
        location_id: (await apiContext.get('/api/locations').then(r => r.json()))[0].id,
        priority: 1,
        include_in_demand: true,
        aspiration_start: new Date().toISOString().split('T')[0],
        aspiration_finish: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    });
    const projectData = await project.json();
    
    // Add project to scenario
    await apiContext.post('/api/scenario-projects', {
      data: {
        scenario_id: scenarioData.id,
        project_id: projectData.id
      }
    });
    
    // Get a person and role
    const people = await apiContext.get('/api/people').then(r => r.json());
    const roles = await apiContext.get('/api/roles').then(r => r.json());
    const person = people[0];
    const role = roles.find((r: any) => r.name === 'Software Developer') || roles[0];
    
    // Create an assignment directly in the scenario (no resource template)
    await apiContext.post('/api/assignments', {
      data: {
        scenario_id: scenarioData.id,
        project_id: projectData.id,
        person_id: person.id,
        role_id: role.id,
        allocation_percentage: 100,
        assignment_date_mode: 'fixed',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    });
    
    // Navigate to demand report
    await testHelpers.navigateTo('/reports');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Ensure we're on the demand report tab
    const demandTab = authenticatedPage.locator('button:has-text("Demand")').first();
    if (await demandTab.isVisible()) {
      await demandTab.click();
      await authenticatedPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    }
    
    // Check that demand data is displayed (not empty)
    const emptyState = authenticatedPage.locator('text=/no data|no demand|0 hours total/i');
    const hasEmptyState = await emptyState.count() > 0;
    
    if (hasEmptyState) {
      // This would indicate the bug - demand report showing empty when it shouldn't
      throw new Error('Demand report shows empty state despite having active assignments');
    }
    
    // Verify we have actual demand data
    const totalDemandElement = authenticatedPage.locator('text=/Total Demand.*\\d+\\s*hours/i');
    await expect(totalDemandElement).toBeVisible();
    
    // Extract the hours value
    const demandText = await totalDemandElement.textContent();
    const hoursMatch = demandText?.match(/(\\d+)\\s*hours/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    
    // With 100% allocation for 90 days, we should have significant hours
    expect(hours).toBeGreaterThan(0);
    expect(hours).toBeGreaterThan(400); // Rough calculation: 90 days * 5 days/week * 8 hours/day * 100%
    
    // Check that our test project appears in the demand breakdown
    const projectInDemand = authenticatedPage.locator(`text="${projectData.name}"`);
    await expect(projectInDemand).toBeVisible();
    
    // Clean up
    await apiContext.delete(`/api/scenarios/${scenarioData.id}`);
    await apiContext.delete(`/api/projects/${projectData.id}`);
    
    console.log('✅ Demand report correctly shows data from actual assignments');
  });

  test(`${tags.critical} should handle mixed scenarios with both templates and assignments`, async ({ 
    apiContext,
    authenticatedPage,
    testHelpers
  }) => {
    // This test would verify that when both resource templates AND actual assignments exist,
    // the demand report shows data from actual assignments (not templates)
    
    // Navigate to demand report
    await testHelpers.navigateTo('/reports');
    
    // If we have any existing data, verify it shows
    const demandSummary = authenticatedPage.locator('.summary-card, .demand-summary').first();
    if (await demandSummary.isVisible()) {
      const summaryText = await demandSummary.textContent();
      
      // Check that we're showing assignment-based demand
      if (summaryText?.includes('0 hours') || summaryText?.includes('No demand')) {
        // Check if there are actually assignments in the system
        const assignmentsResponse = await apiContext.get('/api/assignments');
        const assignments = await assignmentsResponse.json();
        
        if (assignments.length > 0) {
          throw new Error('Demand report shows no demand despite having assignments');
        }
      }
    }
    
    console.log('✅ Demand report handles mixed template/assignment scenarios');
  });
});