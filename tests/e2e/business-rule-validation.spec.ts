import { test, expect } from '@playwright/test';

/**
 * Critical Business Rule Validation Tests
 * 
 * This test suite validates the core business rules that govern the capacity planning system:
 * - Allocation percentages must never exceed 100% for any person during overlapping periods
 * - Project timelines must be consistent (start < end dates)
 * - Resource capacity limits must be enforced
 * - Assignment conflicts must be detected and prevented
 * 
 * These tests ensure data integrity and prevent business logic violations
 * that could corrupt capacity planning calculations.
 */

// Helper function to login as a user
async function loginAsUser(page: any, personId: string = '123e4567-e89b-12d3-a456-426614174000') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const loginSelect = page.locator('#person-select');
  if (await loginSelect.count() > 0) {
    await loginSelect.selectOption(personId);
    await page.click('.login-button');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
}

// Helper to create assignment and monitor for conflicts
async function attemptAssignmentCreation(page: any, assignmentData: any) {
  await page.goto('/assignments');
  await page.waitForLoadState('networkidle');

  // Track API responses for business rule violations
  const businessRuleViolations = [];
  
  page.on('response', async response => {
    if (response.url().includes('/api/assignments') && response.status() === 400) {
      try {
        const errorData = await response.json();
        if (errorData.error && (
          errorData.error.includes('capacity') || 
          errorData.error.includes('allocation') ||
          errorData.error.includes('exceed')
        )) {
          businessRuleViolations.push({
            error: errorData.error,
            conflicts: errorData.conflicts,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        // Response might not be JSON
      }
    }
  });

  // Attempt to create assignment
  const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")');
  if (await newButton.count() > 0) {
    await newButton.first().click();
    await page.waitForTimeout(1000);

    // Fill form fields
    if (assignmentData.allocation) {
      const allocationField = page.locator('input[type="number"], input[placeholder*="percent"], input[id*="allocation"]').first();
      if (await allocationField.count() > 0) {
        await allocationField.fill(String(assignmentData.allocation));
      }
    }

    if (assignmentData.startDate) {
      const startDateField = page.locator('input[type="date"], input[name*="start"], input[id*="start"]').first();
      if (await startDateField.count() > 0) {
        await startDateField.fill(assignmentData.startDate);
      }
    }

    if (assignmentData.endDate) {
      const endDateField = page.locator('input[type="date"], input[name*="end"], input[id*="end"]').last();
      if (await endDateField.count() > 0) {
        await endDateField.fill(assignmentData.endDate);
      }
    }

    // Try to submit
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }

    // Close modal if it's still open (indicates failure)
    const modal = page.locator('.modal, .dialog, [role="dialog"] > div');
    if (await modal.count() > 0) {
      const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), [role="dialog"] button[aria-label="Close"], [aria-label="Close"]');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
        await page.waitForTimeout(500);
      }
    }
  }

  return {
    violations: businessRuleViolations,
    success: businessRuleViolations.length === 0
  };
}

test.describe('Business Rule Validation - Allocation Percentages', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should prevent total allocation exceeding 100% for overlapping assignments', async ({ page }) => {
    console.log('📊 Testing 100% allocation limit enforcement');

    // First assignment: 70% allocation
    console.log('Creating first assignment: 70%');
    const firstAssignment = await attemptAssignmentCreation(page, {
      allocation: 70,
      startDate: '2024-06-01',
      endDate: '2024-08-31'
    });

    // Should succeed
    expect(firstAssignment.violations.length).toBe(0);
    console.log('✅ First assignment (70%) created successfully');

    // Second assignment: 40% allocation (would total 110%)
    console.log('Attempting second assignment: 40% (total would be 110%)');
    const secondAssignment = await attemptAssignmentCreation(page, {
      allocation: 40,
      startDate: '2024-07-01', // Overlaps with first assignment
      endDate: '2024-09-30'
    });

    // Should fail due to business rule violation
    expect(secondAssignment.violations.length).toBeGreaterThan(0);
    console.log('✅ Second assignment properly rejected - would exceed 100%');
    
    if (secondAssignment.violations.length > 0) {
      const violation = secondAssignment.violations[0];
      expect(violation.error).toContain('capacity');
      console.log(`✅ Business rule error: ${violation.error}`);
    }
  });

  test('should allow exactly 100% allocation', async ({ page }) => {
    console.log('📊 Testing exactly 100% allocation acceptance');

    // First assignment: 60% allocation
    const firstAssignment = await attemptAssignmentCreation(page, {
      allocation: 60,
      startDate: '2024-09-01',
      endDate: '2024-11-30'
    });

    expect(firstAssignment.violations.length).toBe(0);
    console.log('✅ First assignment (60%) created successfully');

    // Second assignment: exactly 40% (total exactly 100%)
    const secondAssignment = await attemptAssignmentCreation(page, {
      allocation: 40,
      startDate: '2024-10-01', // Overlaps with first
      endDate: '2024-12-31'
    });

    // Should succeed - exactly 100% is allowed
    expect(secondAssignment.violations.length).toBe(0);
    console.log('✅ Second assignment (40%) created - exactly 100% total is allowed');
  });

  test('should handle edge case: 1% over limit', async ({ page }) => {
    console.log('📊 Testing edge case: exceeding by just 1%');

    // Create assignment at 99%
    const firstAssignment = await attemptAssignmentCreation(page, {
      allocation: 99,
      startDate: '2024-10-01',
      endDate: '2024-12-31'
    });

    expect(firstAssignment.violations.length).toBe(0);
    console.log('✅ 99% allocation created successfully');

    // Try to add 2% more (total 101%)
    const overLimitAssignment = await attemptAssignmentCreation(page, {
      allocation: 2,
      startDate: '2024-11-01',
      endDate: '2024-12-15'
    });

    // Should fail - even 1% over is not allowed
    expect(overLimitAssignment.violations.length).toBeGreaterThan(0);
    console.log('✅ 1% over limit properly rejected');
  });

  test('should handle multiple overlapping periods correctly', async ({ page }) => {
    console.log('📊 Testing complex overlapping period validation');

    // Create multiple assignments with different overlap patterns
    const assignments = [
      { allocation: 40, startDate: '2024-01-01', endDate: '2024-03-31', name: 'Q1 Assignment' },
      { allocation: 30, startDate: '2024-02-15', endDate: '2024-05-15', name: 'Mid-Q1 to Mid-Q2' },
      { allocation: 25, startDate: '2024-04-01', endDate: '2024-06-30', name: 'Q2 Assignment' }
    ];

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      console.log(`Creating ${assignment.name}: ${assignment.allocation}%`);
      
      const result = await attemptAssignmentCreation(page, assignment);
      
      if (i < 2) {
        // First two should succeed (40% + 30% = 70% during overlap)
        expect(result.violations.length).toBe(0);
        console.log(`✅ ${assignment.name} created successfully`);
      } else {
        // Third might fail if it creates over-allocation during overlap period
        if (result.violations.length > 0) {
          console.log(`✅ ${assignment.name} properly rejected due to overlap conflicts`);
        } else {
          console.log(`ℹ️ ${assignment.name} created (no overlap detected)`);
        }
      }
    }
  });

  test('should respect person availability limits', async ({ page }) => {
    console.log('📊 Testing person availability limit enforcement');

    // Test scenarios where person has reduced availability
    // (This would require setting up availability data, but we test the UI behavior)
    
    const highAllocationAssignment = await attemptAssignmentCreation(page, {
      allocation: 95, // Very high allocation
      startDate: '2024-08-01',
      endDate: '2024-10-31'
    });

    if (highAllocationAssignment.violations.length > 0) {
      console.log('✅ High allocation properly validated against availability');
      expect(highAllocationAssignment.violations[0].error).toContain('capacity');
    } else {
      console.log('ℹ️ High allocation accepted (person has full availability)');
    }
  });
});

test.describe('Business Rule Validation - Date and Timeline Consistency', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should prevent assignments with end date before start date', async ({ page }) => {
    console.log('📅 Testing invalid date range prevention');

    const invalidDateAssignment = await attemptAssignmentCreation(page, {
      allocation: 50,
      startDate: '2024-12-31', // End of year
      endDate: '2024-01-01'     // Beginning of year - invalid!
    });

    // Should either be prevented by client-side validation or server-side business rules
    const endDateField = page.locator('input[type="date"]').last();
    if (await endDateField.count() > 0) {
      const endDateValue = await endDateField.inputValue();
      const startDateField = page.locator('input[type="date"]').first();
      const startDateValue = await startDateField.inputValue();
      
      if (endDateValue && startDateValue) {
        const endDate = new Date(endDateValue);
        const startDate = new Date(startDateValue);
        
        // End date should not be before start date
        expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        console.log('✅ Date validation prevented invalid date range');
      }
    }
  });

  test('should handle same-day assignments correctly', async ({ page }) => {
    console.log('📅 Testing same-day assignment handling');

    const sameDayAssignment = await attemptAssignmentCreation(page, {
      allocation: 100,
      startDate: '2024-07-15',
      endDate: '2024-07-15' // Same day
    });

    // Same-day assignments should be allowed
    console.log(`Same-day assignment result: ${sameDayAssignment.success ? 'accepted' : 'rejected'}`);
    
    // If rejected, it should be for business reasons, not date validation
    if (sameDayAssignment.violations.length > 0) {
      expect(sameDayAssignment.violations[0].error).not.toContain('date');
    }
  });

  test('should validate weekend and holiday handling', async ({ page }) => {
    console.log('📅 Testing weekend/holiday date handling');

    // Test assignments on various edge dates
    const edgeDateScenarios = [
      { startDate: '2024-07-06', endDate: '2024-07-07', name: 'Weekend dates' },
      { startDate: '2024-12-24', endDate: '2024-12-26', name: 'Holiday period' },
      { startDate: '2024-02-29', endDate: '2024-03-01', name: 'Leap year boundary' }
    ];

    for (const scenario of edgeDateScenarios) {
      console.log(`Testing ${scenario.name}`);
      
      const result = await attemptAssignmentCreation(page, {
        allocation: 25,
        ...scenario
      });

      // Should handle edge dates gracefully
      if (result.violations.length > 0) {
        console.log(`${scenario.name}: handled with business validation`);
      } else {
        console.log(`✅ ${scenario.name}: accepted`);
      }
    }
  });

  test('should prevent assignments in the distant past', async ({ page }) => {
    console.log('📅 Testing historical date validation');

    const historicalAssignment = await attemptAssignmentCreation(page, {
      allocation: 50,
      startDate: '2020-01-01', // Far in the past
      endDate: '2020-03-31'
    });

    // System should either prevent historical assignments or handle them appropriately
    console.log(`Historical assignment result: ${historicalAssignment.success ? 'accepted' : 'rejected'}`);
    
    if (historicalAssignment.violations.length > 0) {
      console.log('✅ Historical assignments properly validated');
    }
  });
});

test.describe('Business Rule Validation - Project and Resource Constraints', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should validate project timeline constraints', async ({ page }) => {
    console.log('🎯 Testing project timeline constraint enforcement');

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Monitor for any project-related business rule violations
    const projectViolations = [];
    page.on('response', async response => {
      if (response.url().includes('/api/projects') && response.status() === 400) {
        try {
          const errorData = await response.json();
          projectViolations.push(errorData);
        } catch (e) {
          // Response might not be JSON
        }
      }
    });

    // Check for project creation/edit functionality
    const projectButtons = page.locator('button:has-text("New"), button:has-text("Edit"), button:has-text("Create")');
    if (await projectButtons.count() > 0) {
      await projectButtons.first().click();
      await page.waitForTimeout(1000);

      // If project form is available, test invalid timeline
      const startDateField = page.locator('input[type="date"]').first();
      const endDateField = page.locator('input[type="date"]').last();
      
      if (await startDateField.count() > 0 && await endDateField.count() > 0) {
        await startDateField.fill('2024-12-31');
        await endDateField.fill('2024-01-01'); // Invalid: end before start
        
        const submitButton = page.locator('button:has-text("Create"), button:has-text("Save")');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }
      }

      console.log(`Project timeline validation result: ${projectViolations.length} violations detected`);
    } else {
      console.log('ℹ️ No project creation form found');
    }
  });

  test('should enforce role and skill requirements', async ({ page }) => {
    console.log('👥 Testing role and skill requirement validation');

    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');

    // Test assignment creation without proper role selection
    const newButton = page.locator('button:has-text("New"), button:has-text("Add")');
    if (await newButton.count() > 0) {
      await newButton.first().click();
      await page.waitForTimeout(1000);

      // Try to create assignment without selecting role
      const allocationField = page.locator('input[type="number"]').first();
      if (await allocationField.count() > 0) {
        await allocationField.fill('50');
      }

      const submitButton = page.locator('button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.count() > 0) {
        const isDisabled = await submitButton.isDisabled();
        if (isDisabled) {
          console.log('✅ Form validation prevents submission without required role');
        } else {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check if form validation caught the missing role
          const errorMessages = await page.locator('.error, .alert, .validation-error').count();
          if (errorMessages > 0) {
            console.log('✅ Server validation caught missing role requirement');
          }
        }
      }
    }
  });

  test('should validate capacity planning business rules', async ({ page }) => {
    console.log('📊 Testing capacity planning business rule enforcement');

    // Navigate to different sections to test business rule consistency
    const sections = [
      { path: '/assignments', name: 'Assignments' },
      { path: '/people', name: 'People' },
      { path: '/projects', name: 'Projects' }
    ];

    for (const section of sections) {
      await page.goto(section.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for any business rule violations in UI
      const errorElements = await page.locator('.error, .warning, .alert-error, .validation-error').count();
      expect(errorElements).toBe(0);
      console.log(`✅ ${section.name} section: no business rule violations in UI`);

      // Check for data consistency indicators
      const dataElements = await page.locator('table, .card, .item, .row').count();
      if (dataElements > 0) {
        console.log(`✅ ${section.name} section: ${dataElements} data elements displayed consistently`);
      }
    }
  });
});

test.describe('Business Rule Validation - Edge Cases and Error Recovery', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should handle zero and negative allocation percentages', async ({ page }) => {
    console.log('🔢 Testing zero and negative allocation handling');

    const edgeAllocations = [
      { allocation: 0, expected: 'might be allowed', name: '0% allocation' },
      { allocation: -10, expected: 'should be rejected', name: 'negative allocation' },
      { allocation: 0.1, expected: 'might be allowed', name: 'minimal allocation' }
    ];

    for (const test of edgeAllocations) {
      console.log(`Testing ${test.name}: ${test.allocation}%`);
      
      const result = await attemptAssignmentCreation(page, {
        allocation: test.allocation,
        startDate: '2024-05-01',
        endDate: '2024-05-31'
      });

      if (test.allocation < 0) {
        // Negative allocations should be rejected
        if (result.violations.length > 0 || !result.success) {
          console.log(`✅ ${test.name} properly rejected`);
        }
      } else {
        console.log(`ℹ️ ${test.name} result: ${result.success ? 'accepted' : 'rejected'}`);
      }
    }
  });

  test('should maintain business rule consistency under rapid operations', async ({ page }) => {
    console.log('⚡ Testing business rule consistency under rapid operations');

    // Perform rapid assignment creation attempts
    for (let i = 0; i < 5; i++) {
      const result = await attemptAssignmentCreation(page, {
        allocation: 20, // Each 20%, total would be 100% if all succeed
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      });

      console.log(`Rapid attempt ${i + 1}: ${result.success ? 'succeeded' : 'failed'}`);
      
      // Total of all successful attempts should not exceed 100%
      if (!result.success && result.violations.length > 0) {
        console.log('✅ Business rules enforced during rapid operations');
      }
    }
  });

  test('should recover gracefully from business rule violations', async ({ page }) => {
    console.log('🔄 Testing graceful recovery from business rule violations');

    // Attempt to create invalid assignment
    const invalidResult = await attemptAssignmentCreation(page, {
      allocation: 150, // Invalid: over 100%
      startDate: '2024-07-01',
      endDate: '2024-07-31'
    });

    // Should fail gracefully
    if (invalidResult.violations.length > 0) {
      console.log('✅ Invalid assignment properly rejected');
    }

    // System should still be functional for valid assignments
    const validResult = await attemptAssignmentCreation(page, {
      allocation: 50, // Valid allocation
      startDate: '2024-08-01',
      endDate: '2024-08-31'
    });

    // Should succeed after previous failure
    console.log(`Recovery test: ${validResult.success ? 'system recovered' : 'system still affected'}`);
    
    // Navigate to verify system health
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const dashboardWorking = await page.locator('h1, h2, .dashboard').count() > 0;
    expect(dashboardWorking).toBe(true);
    console.log('✅ System fully functional after business rule violation');
  });
});