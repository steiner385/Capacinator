/**
 * Capacity Report Data Structure Tests
 * Ensures the capacity report API returns the correct data structure
 * and prevents regression of the 0% availability bug
 */
import { test, expect, tags } from '../../fixtures';

test.describe('Capacity Report Data Structure', () => {
  test(`${tags.critical} ${tags.api} should return correct utilization data structure`, async ({ 
    apiContext
  }) => {
    const response = await apiContext.get('/api/reporting/capacity');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify the main structure
    expect(data).toHaveProperty('capacityGaps');
    expect(data).toHaveProperty('byRole');
    expect(data).toHaveProperty('utilizationData');
    expect(data).toHaveProperty('personUtilization');
    expect(data).toHaveProperty('timeline');
    expect(data).toHaveProperty('summary');
    
    // Verify utilizationData has the correct fields
    if (data.utilizationData && data.utilizationData.length > 0) {
      const firstPerson = data.utilizationData[0];
      
      // These fields MUST exist for the frontend to work correctly
      expect(firstPerson).toHaveProperty('person_id');
      expect(firstPerson).toHaveProperty('person_name');
      expect(firstPerson).toHaveProperty('default_availability_percentage');
      expect(firstPerson).toHaveProperty('available_hours');
      expect(firstPerson).toHaveProperty('total_allocated_hours');
      expect(firstPerson).toHaveProperty('allocation_status');
      
      // Verify data types and values
      expect(typeof firstPerson.default_availability_percentage).toBe('number');
      expect(firstPerson.default_availability_percentage).toBeGreaterThanOrEqual(0);
      expect(firstPerson.default_availability_percentage).toBeLessThanOrEqual(100);
      
      expect(typeof firstPerson.available_hours).toBe('number');
      expect(firstPerson.available_hours).toBeGreaterThanOrEqual(0);
      
      expect(typeof firstPerson.total_allocated_hours).toBe('number');
      expect(firstPerson.total_allocated_hours).toBeGreaterThanOrEqual(0);
      
      // Allocation status should be one of the expected values
      const validStatuses = ['AVAILABLE', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'OVER_ALLOCATED', 'UNAVAILABLE'];
      expect(validStatuses).toContain(firstPerson.allocation_status);
    }
  });

  test(`${tags.critical} should not return null or zero for all availability percentages`, async ({ 
    apiContext,
    testDataHelpers 
  }) => {
    // Create test people with known availability
    const testContext = testDataHelpers.createTestContext('capacity-data');
    const testData = await testDataHelpers.createBulkTestData(testContext, {
      people: 3
    });
    
    try {
      const response = await apiContext.get('/api/reporting/capacity');
      const data = await response.json();
      
      // Find our test people in the utilization data
      const testPeopleData = data.utilizationData.filter((person: any) =>
        testData.people.some((p: any) => p.id === person.person_id)
      );
      
      expect(testPeopleData.length).toBeGreaterThan(0);
      
      // Verify that not all people have 0% availability
      const peopleWithAvailability = testPeopleData.filter((person: any) => 
        person.default_availability_percentage > 0
      );
      
      expect(peopleWithAvailability.length).toBeGreaterThan(0);
      
      // Each person should have reasonable default values
      testPeopleData.forEach((person: any) => {
        expect(person.default_availability_percentage).toBeDefined();
        expect(person.available_hours).toBeDefined();
        
        // If no explicit overrides, should have default values
        if (!person.availability_reason) {
          expect(person.default_availability_percentage).toBeGreaterThan(0);
          expect(person.available_hours).toBeGreaterThan(0);
        }
      });
    } finally {
      await testDataHelpers.cleanupTestContext(testContext);
    }
  });

  test(`${tags.critical} should correctly calculate allocated hours from percentage`, async ({ 
    apiContext,
    testDataHelpers
  }) => {
    const testContext = testDataHelpers.createTestContext('capacity-calc');
    
    // Create a person with a specific allocation
    const person = await testDataHelpers.createPerson(testContext, {
      default_hours_per_day: 8,
      default_availability_percentage: 100
    });
    
    // Create a project and assignment with known allocation
    const project = await testDataHelpers.createProject(testContext);
    
    // Create an active scenario
    const scenario = await testDataHelpers.createScenario(testContext, {
      scenario_type: 'baseline',
      status: 'active'
    });
    
    // Create assignment with 50% allocation
    await testDataHelpers.createAssignment(testContext, {
      scenario_id: scenario.id,
      project_id: project.id,
      person_id: person.id,
      allocation_percentage: 50
    });
    
    try {
      const response = await apiContext.get('/api/reporting/capacity');
      const data = await response.json();
      
      // Find our test person
      const testPerson = data.utilizationData.find((p: any) => p.person_id === person.id);
      expect(testPerson).toBeDefined();
      
      // Verify calculations
      expect(testPerson.total_allocation_percentage).toBe(50);
      expect(testPerson.total_allocated_hours).toBe(4); // 50% of 8 hours
      expect(testPerson.available_hours).toBe(8);
      expect(testPerson.allocation_status).toBe('PARTIALLY_ALLOCATED');
    } finally {
      await testDataHelpers.cleanupTestContext(testContext);
    }
  });

  test(`${tags.critical} ${tags.ui} should display correct values in capacity table`, async ({ 
    authenticatedPage,
    testHelpers 
  }) => {
    await testHelpers.navigateTo('/reports');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Switch to capacity report tab
    const capacityTab = authenticatedPage.locator('button:has-text("Capacity")').first();
    await capacityTab.click();
    await authenticatedPage.waitForTimeout(1000);
    
    // Check that the table exists
    const peopleTable = authenticatedPage.locator('table').filter({ hasText: 'Daily Hours' });
    await expect(peopleTable).toBeVisible();
    
    // Get first data row
    const firstRow = peopleTable.locator('tbody tr').first();
    
    if (await firstRow.isVisible()) {
      // Check availability column - should not be "0%" for everyone
      const availabilityCell = firstRow.locator('td').nth(2);
      const availabilityText = await availabilityCell.textContent();
      
      // Should be a percentage value
      expect(availabilityText).toMatch(/\d+%/);
      
      // Check daily hours column - should not be "NaN" or empty
      const hoursCell = firstRow.locator('td').nth(1);
      const hoursText = await hoursCell.textContent();
      
      expect(hoursText).toMatch(/\d+(\.\d+)?\s*hrs\/day/);
      expect(hoursText).not.toContain('NaN');
      
      // Verify at least some people have non-zero availability
      const allRows = peopleTable.locator('tbody tr');
      const rowCount = await allRows.count();
      
      if (rowCount > 0) {
        let nonZeroAvailabilityFound = false;
        
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
          const row = allRows.nth(i);
          const availText = await row.locator('td').nth(2).textContent();
          
          if (availText && availText !== '0%') {
            nonZeroAvailabilityFound = true;
            break;
          }
        }
        
        expect(nonZeroAvailabilityFound).toBe(true);
      }
    }
  });

  test(`${tags.reports} byRole field should match frontend expectations`, async ({ 
    apiContext 
  }) => {
    const response = await apiContext.get('/api/reporting/capacity');
    const data = await response.json();
    
    expect(data.byRole).toBeDefined();
    expect(Array.isArray(data.byRole)).toBe(true);
    
    if (data.byRole.length > 0) {
      const firstRole = data.byRole[0];
      
      // Verify the structure matches what frontend expects
      expect(firstRole).toHaveProperty('id');
      expect(firstRole).toHaveProperty('role');
      expect(firstRole).toHaveProperty('capacity');
      expect(firstRole).toHaveProperty('utilized');
      expect(firstRole).toHaveProperty('available');
      expect(firstRole).toHaveProperty('people_count');
      expect(firstRole).toHaveProperty('status');
      
      // Values should be numbers, not null
      expect(typeof firstRole.capacity).toBe('number');
      expect(typeof firstRole.utilized).toBe('number');
      expect(typeof firstRole.available).toBe('number');
      expect(typeof firstRole.people_count).toBe('number');
    }
  });
});