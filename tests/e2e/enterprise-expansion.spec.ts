import { test, expect } from '@playwright/test';
import { TestDataGenerator } from './helpers/test-data-generator';

test.describe('Enterprise Expansion Scenario', () => {
  let testDataGenerator: TestDataGenerator;
  let testData: any;

  test.beforeEach(async ({ request }) => {
    testDataGenerator = new TestDataGenerator(request);
    
    // Generate comprehensive test data for enterprise expansion
    testData = await testDataGenerator.generateEnterpriseExpansionData();
  });

  test('should handle complex enterprise expansion with multi-location resource allocation', async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto('/');
    
    // Verify dashboard loads with enterprise data
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Test 1: Verify locations are properly set up
    await page.click('nav [href="/locations"]');
    await expect(page.locator('.location-card')).toHaveCount(4); // SF, NYC, London, Berlin
    
    // Verify each location shows correct employee count
    const sfLocation = page.locator('.location-card:has-text("San Francisco")');
    await expect(sfLocation.locator('.employee-count')).toContainText('employees');
    
    // Test 2: Verify organizational hierarchy in people page
    await page.click('nav [href="/people"]');
    await expect(page.locator('.person-card')).toHaveCount(testData.employees.length);
    
    // Check that VPs, Directors, and Managers are displayed correctly
    const vpCard = page.locator('.person-card:has-text("VP")').first();
    await expect(vpCard).toBeVisible();
    await expect(vpCard.locator('.person-title')).toContainText('VP');
    
    // Test 3: Verify project portfolio management
    await page.click('nav [href="/projects"]');
    await expect(page.locator('.project-card')).toHaveCount(testData.projects.length);
    
    // Check AI/ML Platform project
    const aiProject = page.locator('.project-card:has-text("AI/ML Platform")').first();
    await expect(aiProject).toBeVisible();
    await expect(aiProject.locator('.project-priority')).toContainText('HIGH');
    
    // Test 4: Navigate to project details and verify demand curve
    await aiProject.click();
    await expect(page.locator('h1')).toContainText('AI/ML Platform');
    
    // Verify demand curve section is present
    await expect(page.locator('.demand-curve-section')).toBeVisible();
    await expect(page.locator('.demand-chart')).toBeVisible();
    
    // Check that demand curve shows resource requirements over time
    const demandChart = page.locator('.demand-chart');
    await expect(demandChart.locator('.recharts-line')).toBeVisible();
    await expect(demandChart.locator('.recharts-tooltip')).toBeVisible();
    
    // Test 5: Verify assignments and resource allocation
    await page.click('nav [href="/assignments"]');
    await expect(page.locator('.assignment-row')).toHaveCount(testData.assignments.length);
    
    // Check for over-allocation warnings
    const overAllocated = page.locator('.assignment-row.over-allocated');
    if (await overAllocated.count() > 0) {
      await expect(overAllocated.first().locator('.allocation-warning')).toBeVisible();
    }
    
    // Test 6: Verify capacity planning and reporting
    await page.click('nav [href="/reports"]');
    await expect(page.locator('.report-section')).toBeVisible();
    
    // Generate capacity report
    await page.click('button:has-text("Generate Capacity Report")');
    await expect(page.locator('.capacity-report')).toBeVisible();
    
    // Verify report shows capacity gaps by location
    const capacityByLocation = page.locator('.capacity-by-location');
    await expect(capacityByLocation).toBeVisible();
    await expect(capacityByLocation.locator('.location-capacity')).toHaveCount(4);
    
    // Test 7: Verify person allocation charts
    await page.click('nav [href="/people"]');
    const firstPerson = page.locator('.person-card').first();
    await firstPerson.click();
    
    // Check person details page has allocation chart
    await expect(page.locator('.allocation-chart-section')).toBeVisible();
    const allocationChart = page.locator('.allocation-chart');
    await expect(allocationChart.locator('.recharts-area')).toBeVisible();
    
    // Verify utilization trends are displayed
    await expect(allocationChart.locator('.utilization-trend')).toBeVisible();
    
    // Test 8: Test availability overrides impact
    await page.click('button:has-text("Edit")');
    await page.click('button:has-text("Add Time Off")');
    
    // Add vacation override
    await page.fill('input[name="start_date"]', '2025-08-01');
    await page.fill('input[name="end_date"]', '2025-08-15');
    await page.selectOption('select[name="override_type"]', 'VACATION');
    await page.fill('input[name="availability_percentage"]', '0');
    await page.fill('textarea[name="reason"]', 'Annual vacation');
    await page.click('button:has-text("Save Override")');
    
    // Verify override appears in the list
    await expect(page.locator('.override-item:has-text("VACATION")')).toBeVisible();
    
    // Test 9: Verify project phase management
    await page.click('nav [href="/projects"]');
    await page.locator('.project-card').first().click();
    
    // Check project phases
    await expect(page.locator('.project-phases')).toBeVisible();
    await expect(page.locator('.phase-item')).toHaveCount(testData.projectPhases.filter(p => p.project_id === testData.projects[0].id).length);
    
    // Test 10: Emergency project scenario
    await page.click('nav [href="/projects"]');
    await page.click('button:has-text("New Project")');
    
    // Create emergency project
    await page.fill('input[name="name"]', 'EMERGENCY: Security Breach Response');
    await page.selectOption('select[name="project_type_id"]', testData.projectTypes[0].id);
    await page.selectOption('select[name="location_id"]', testData.locations[0].id);
    await page.selectOption('select[name="priority"]', '1'); // Highest priority
    await page.fill('textarea[name="description"]', 'Critical security incident response');
    await page.check('input[name="include_in_demand"]');
    await page.fill('input[name="aspiration_start"]', '2025-07-10');
    await page.fill('input[name="aspiration_finish"]', '2025-07-24');
    await page.click('button:has-text("Create Project")');
    
    // Verify emergency project was created
    await expect(page.locator('.project-card:has-text("EMERGENCY")')).toBeVisible();
    
    // Test 11: Resource conflict detection
    await page.click('nav [href="/assignments"]');
    await page.click('button:has-text("Bulk Assign")');
    
    // Try to assign key person to emergency project (should create conflict)
    const keyPerson = testData.employees.find(e => e.title?.includes('Senior'));
    if (keyPerson) {
      await page.selectOption('select[name="person_id"]', keyPerson.id);
      await page.selectOption('select[name="project_id"]', testData.projects[0].id);
      await page.fill('input[name="allocation_percentage"]', '80');
      await page.fill('input[name="start_date"]', '2025-07-10');
      await page.fill('input[name="end_date"]', '2025-07-24');
      await page.click('button:has-text("Check Conflicts")');
      
      // Should show conflict warning
      await expect(page.locator('.conflict-warning')).toBeVisible();
      await expect(page.locator('.conflict-message')).toContainText('over-allocated');
    }
    
    // Test 12: Executive reporting dashboard
    await page.click('nav [href="/reports"]');
    await page.click('button:has-text("Executive Dashboard")');
    
    // Verify executive dashboard components
    await expect(page.locator('.executive-summary')).toBeVisible();
    await expect(page.locator('.portfolio-health')).toBeVisible();
    await expect(page.locator('.resource-utilization')).toBeVisible();
    await expect(page.locator('.risk-indicators')).toBeVisible();
    
    // Check portfolio health metrics
    const portfolioHealth = page.locator('.portfolio-health');
    await expect(portfolioHealth.locator('.health-metric')).toHaveCount(4); // One per location
    await expect(portfolioHealth.locator('.health-score')).toBeVisible();
    
    // Test 13: Multi-timezone handling
    await page.click('nav [href="/assignments"]');
    
    // Create assignment spanning multiple timezones
    await page.click('button:has-text("New Assignment")');
    const londonPerson = testData.employees.find(e => e.location_id === testData.locations.find(l => l.name === 'London')?.id);
    const sfProject = testData.projects.find(p => p.location_id === testData.locations.find(l => l.name === 'San Francisco')?.id);
    
    if (londonPerson && sfProject) {
      await page.selectOption('select[name="person_id"]', londonPerson.id);
      await page.selectOption('select[name="project_id"]', sfProject.id);
      await page.fill('input[name="allocation_percentage"]', '40');
      await page.fill('input[name="start_date"]', '2025-07-15');
      await page.fill('input[name="end_date"]', '2025-09-15');
      await page.click('button:has-text("Create Assignment")');
      
      // Verify assignment was created with timezone considerations
      await expect(page.locator('.assignment-row:has-text("London")')).toBeVisible();
      await expect(page.locator('.assignment-row:has-text("San Francisco")')).toBeVisible();
    }
    
    // Test 14: Demand vs capacity reconciliation
    await page.click('nav [href="/reports"]');
    await page.click('button:has-text("Demand vs Capacity")');
    
    // Verify demand vs capacity report
    await expect(page.locator('.demand-capacity-report')).toBeVisible();
    await expect(page.locator('.demand-chart')).toBeVisible();
    await expect(page.locator('.capacity-chart')).toBeVisible();
    
    // Check for capacity gaps
    const capacityGaps = page.locator('.capacity-gap');
    if (await capacityGaps.count() > 0) {
      await expect(capacityGaps.first().locator('.gap-details')).toBeVisible();
      await expect(capacityGaps.first().locator('.gap-recommendations')).toBeVisible();
    }
    
    // Test 15: Skills gap analysis
    await page.click('button:has-text("Skills Analysis")');
    await expect(page.locator('.skills-gap-analysis')).toBeVisible();
    
    // Verify skills demand vs supply
    const skillsChart = page.locator('.skills-demand-chart');
    await expect(skillsChart.locator('.recharts-bar')).toBeVisible();
    await expect(skillsChart.locator('.skill-gap')).toBeVisible();
  });

  test('should handle complex resource reallocation scenarios', async ({ page }) => {
    await page.goto('/assignments');
    
    // Test resource reallocation when project priorities change
    await page.click('nav [href="/projects"]');
    
    // Change project priority
    const project = page.locator('.project-card').first();
    await project.click();
    await page.click('button:has-text("Edit")');
    await page.selectOption('select[name="priority"]', '1'); // Increase priority
    await page.click('button:has-text("Save")');
    
    // Verify assignments are suggested for reallocation
    await page.click('nav [href="/assignments"]');
    await expect(page.locator('.reallocation-suggestion')).toBeVisible();
    
    // Test bulk reallocation
    await page.click('button:has-text("Bulk Reallocation")');
    await page.check('input[name="auto_resolve_conflicts"]');
    await page.click('button:has-text("Apply Reallocation")');
    
    // Verify reallocation was successful
    await expect(page.locator('.reallocation-success')).toBeVisible();
  });

  test('should validate data integrity across all operations', async ({ page }) => {
    await page.goto('/');
    
    // Test data consistency across different views
    await page.click('nav [href="/people"]');
    const peopleCount = await page.locator('.person-card').count();
    
    await page.click('nav [href="/assignments"]');
    const assignmentsCount = await page.locator('.assignment-row').count();
    
    await page.click('nav [href="/reports"]');
    await page.click('button:has-text("Data Integrity Report")');
    
    // Verify data integrity metrics
    await expect(page.locator('.integrity-metric:has-text("People")')).toContainText(peopleCount.toString());
    await expect(page.locator('.integrity-metric:has-text("Assignments")')).toContainText(assignmentsCount.toString());
    
    // Test constraint validation
    await expect(page.locator('.constraint-violations')).toHaveCount(0);
    await expect(page.locator('.data-inconsistencies')).toHaveCount(0);
  });

  test.afterEach(async ({ request }) => {
    // Clean up test data
    await testDataGenerator.cleanup();
  });
});