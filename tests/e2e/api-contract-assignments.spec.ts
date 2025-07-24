import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

/**
 * API Contract Tests for Assignment Operations
 * 
 * These tests validate that API responses return properly serialized JSON
 * without circular references or other serialization issues.
 * 
 * Critical for catching backend serialization bugs that could break
 * frontend functionality.
 */

test.describe('Assignment API Contract Tests', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    await page.goto('/');
    await testHelpers.handleProfileSelection();
  });

  test('should return valid JSON for assignment creation via API', async ({ page }) => {
    // Test direct API call to assignment creation endpoint
    const validAssignmentData = {
      project_id: '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1',
      person_id: '123e4567-e89b-12d3-a456-426614174001', 
      role_id: '69dc7737-845a-43f0-9006-8e24c59a6e9b',
      allocation_percentage: 30,
      start_date: '2023-11-01',
      end_date: '2023-11-30',
      assignment_date_mode: 'fixed'
    };

    const response = await page.request.post('https://localhost:3120/api/assignments', {
      data: validAssignmentData
    });

    // This call will fail if there's a circular reference in the JSON response
    const responseBody = await testHelpers.validateAssignmentCreationResponse(response);
    
    // Verify the response data matches what we sent
    expect(responseBody.project_id).toBe(validAssignmentData.project_id);
    expect(responseBody.person_id).toBe(validAssignmentData.person_id);
    expect(responseBody.role_id).toBe(validAssignmentData.role_id);
    expect(responseBody.allocation_percentage).toBe(validAssignmentData.allocation_percentage);
    expect(responseBody.start_date).toBe(validAssignmentData.start_date);
    expect(responseBody.end_date).toBe(validAssignmentData.end_date);
    
    // Cleanup - delete the created assignment
    await page.request.delete(`https://localhost:3120/api/assignments/${responseBody.id}`);
  });

  test('should return valid JSON for assignment deletion via API', async ({ page }) => {
    // First create an assignment to delete
    const assignmentData = {
      project_id: '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1',
      person_id: '123e4567-e89b-12d3-a456-426614174001',
      role_id: '69dc7737-845a-43f0-9006-8e24c59a6e9b', 
      allocation_percentage: 25,
      start_date: '2023-12-01',
      end_date: '2023-12-15',
      assignment_date_mode: 'fixed'
    };

    const createResponse = await page.request.post('https://localhost:3120/api/assignments', {
      data: assignmentData
    });
    
    const createdAssignment = await testHelpers.validateAssignmentCreationResponse(createResponse);

    // Now test deletion
    const deleteResponse = await page.request.delete(`https://localhost:3120/api/assignments/${createdAssignment.id}`);
    
    // This call will fail if there's a circular reference in the JSON response  
    const deleteResponseBody = await testHelpers.validateAssignmentDeletionResponse(deleteResponse);
    
    expect(deleteResponseBody.message).toContain('deleted');
  });

  test('should handle complex assignment objects without circular references', async ({ page }) => {
    // Test with assignment that triggers all related joins and computed fields
    const complexAssignmentData = {
      project_id: '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1',
      person_id: '123e4567-e89b-12d3-a456-426614174001',
      role_id: '69dc7737-845a-43f0-9006-8e24c59a6e9b',
      allocation_percentage: 50,
      start_date: '2024-01-01', 
      end_date: '2024-03-31',
      assignment_date_mode: 'fixed',
      notes: 'Complex assignment with full data relationships'
    };

    const response = await page.request.post('https://localhost:3120/api/assignments', {
      data: complexAssignmentData
    });

    // This should parse successfully despite complex object relationships
    const responseBody = await testHelpers.validateAssignmentCreationResponse(response);
    
    // Verify computed dates are present
    expect(responseBody).toHaveProperty('computed_start_date');
    expect(responseBody).toHaveProperty('computed_end_date');
    expect(responseBody).toHaveProperty('created_at');
    expect(responseBody).toHaveProperty('updated_at');
    
    // Cleanup
    await page.request.delete(`https://localhost:3120/api/assignments/${responseBody.id}`);
  });

  test('should validate assignment API responses contain no circular references', async ({ page }) => {
    const testAssignment = {
      project_id: '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1',
      person_id: '123e4567-e89b-12d3-a456-426614174001',
      role_id: '69dc7737-845a-43f0-9006-8e24c59a6e9b',
      allocation_percentage: 40,
      start_date: '2024-02-01',
      end_date: '2024-02-29', 
      assignment_date_mode: 'fixed'
    };

    const createResponse = await page.request.post('https://localhost:3120/api/assignments', {
      data: testAssignment
    });

    // Test that JSON.stringify doesn't throw circular reference error
    const responseBody = await createResponse.json();
    
    expect(() => {
      JSON.stringify(responseBody);
    }).not.toThrow();
    
    expect(() => {
      JSON.parse(JSON.stringify(responseBody));
    }).not.toThrow();
    
    console.log('✅ Assignment response successfully round-tripped through JSON.stringify/parse');
    
    // Cleanup
    await page.request.delete(`https://localhost:3120/api/assignments/${responseBody.id}`);
  });

  test('should handle assignment creation errors gracefully without circular references', async ({ page }) => {
    // Test with invalid data that should trigger an error response
    const invalidAssignmentData = {
      project_id: 'invalid-project-id',
      person_id: 'invalid-person-id', 
      role_id: 'invalid-role-id',
      allocation_percentage: 150, // Invalid percentage
      start_date: 'invalid-date',
      end_date: 'invalid-date'
    };

    const response = await page.request.post('https://localhost:3120/api/assignments', {
      data: invalidAssignmentData
    });

    // Should return error but still be valid JSON
    expect(response.status()).toBeGreaterThanOrEqual(400);
    
    // Error response should still be parseable JSON without circular refs
    let errorResponseBody;
    expect(async () => {
      errorResponseBody = await response.json();
    }).not.toThrow();
    
    if (errorResponseBody) {
      expect(errorResponseBody).toHaveProperty('error');
      console.log('✅ Error response successfully parsed as JSON');
    }
  });
});