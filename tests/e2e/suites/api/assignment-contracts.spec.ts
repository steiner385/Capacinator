/**
 * Assignment API Contract Tests
 * Validates API responses for proper JSON serialization and structure
 */

import { test, expect, tags } from '../../fixtures';

test.describe('Assignment API Contract Tests', () => {
  test.describe('Serialization Validation', () => {
    test(`${tags.api} return valid JSON for assignment creation`, async ({ apiContext, testData }) => {
      // Test direct API call to assignment creation endpoint
      const validAssignmentData = {
        project_id: testData.projects[0]?.id || 'test-project-id',
        person_id: testData.people[0]?.id || 'test-person-id',
        role_id: testData.roles[0]?.id || 'test-role-id',
        allocation_percentage: 30,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignment_date_mode: 'fixed'
      };

      const response = await apiContext.post('/api/assignments', {
        data: validAssignmentData
      });

      // This call will fail if there's a circular reference in the JSON response
      const responseBody = await response.json();
      
      // Verify response structure
      expect(response.ok()).toBeTruthy();
      expect(responseBody).toHaveProperty('data');
      
      const assignment = responseBody.data;
      
      // Verify the response data matches what we sent
      expect(assignment.project_id).toBe(validAssignmentData.project_id);
      expect(assignment.person_id).toBe(validAssignmentData.person_id);
      expect(assignment.role_id).toBe(validAssignmentData.role_id);
      expect(assignment.allocation_percentage).toBe(validAssignmentData.allocation_percentage);
      expect(assignment.start_date).toBe(validAssignmentData.start_date);
      expect(assignment.end_date).toBe(validAssignmentData.end_date);
      
      // Cleanup - delete the created assignment
      if (assignment.id) {
        await apiContext.delete(`/api/assignments/${assignment.id}`);
      }
    });

    test(`${tags.api} return valid JSON for assignment deletion`, async ({ apiContext, testData }) => {
      // First create an assignment to delete
      const assignmentData = {
        project_id: testData.projects[0]?.id || 'test-project-id',
        person_id: testData.people[0]?.id || 'test-person-id',
        role_id: testData.roles[0]?.id || 'test-role-id',
        allocation_percentage: 25,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignment_date_mode: 'fixed'
      };

      const createResponse = await apiContext.post('/api/assignments', {
        data: assignmentData
      });
      
      const createResponseBody = await createResponse.json();
      expect(createResponse.ok()).toBeTruthy();
      
      const createdAssignment = createResponseBody.data;

      // Now test deletion
      const deleteResponse = await apiContext.delete(`/api/assignments/${createdAssignment.id}`);
      
      // This call will fail if there's a circular reference in the JSON response  
      const deleteResponseBody = await deleteResponse.json();
      
      expect(deleteResponse.ok()).toBeTruthy();
      expect(deleteResponseBody).toHaveProperty('message');
      expect(deleteResponseBody.message).toContain('deleted');
    });

    test(`${tags.api} handle complex assignment objects without circular references`, async ({ 
      apiContext, 
      testData 
    }) => {
      // Test with assignment that triggers all related joins and computed fields
      const complexAssignmentData = {
        project_id: testData.projects[0]?.id || 'test-project-id',
        person_id: testData.people[0]?.id || 'test-person-id',
        role_id: testData.roles[0]?.id || 'test-role-id',
        allocation_percentage: 50,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignment_date_mode: 'fixed',
        notes: 'Complex assignment with full data relationships'
      };

      const response = await apiContext.post('/api/assignments', {
        data: complexAssignmentData
      });

      // This should parse successfully despite complex object relationships
      const responseBody = await response.json();
      
      expect(response.ok()).toBeTruthy();
      expect(responseBody).toHaveProperty('data');
      
      const assignment = responseBody.data;
      
      // Verify computed dates are present
      expect(assignment).toHaveProperty('computed_start_date');
      expect(assignment).toHaveProperty('computed_end_date');
      expect(assignment).toHaveProperty('created_at');
      expect(assignment).toHaveProperty('updated_at');
      
      // Cleanup
      if (assignment.id) {
        await apiContext.delete(`/api/assignments/${assignment.id}`);
      }
    });

    test(`${tags.api} validate assignment responses contain no circular references`, async ({ 
      apiContext, 
      testData 
    }) => {
      const testAssignment = {
        project_id: testData.projects[0]?.id || 'test-project-id',
        person_id: testData.people[0]?.id || 'test-person-id',
        role_id: testData.roles[0]?.id || 'test-role-id',
        allocation_percentage: 40,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignment_date_mode: 'fixed'
      };

      const createResponse = await apiContext.post('/api/assignments', {
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
      if (responseBody.data?.id) {
        await apiContext.delete(`/api/assignments/${responseBody.data.id}`);
      }
    });
  });

  test.describe('Error Response Validation', () => {
    test(`${tags.api} handle assignment creation errors gracefully`, async ({ apiContext }) => {
      // Test with invalid data that should trigger an error response
      const invalidAssignmentData = {
        project_id: 'invalid-project-id',
        person_id: 'invalid-person-id', 
        role_id: 'invalid-role-id',
        allocation_percentage: 150, // Invalid percentage
        start_date: 'invalid-date',
        end_date: 'invalid-date'
      };

      const response = await apiContext.post('/api/assignments', {
        data: invalidAssignmentData
      });

      // Should return error but still be valid JSON
      expect(response.status()).toBeGreaterThanOrEqual(400);
      
      // Error response should still be parseable JSON without circular refs
      let errorResponseBody;
      
      // Should not throw
      errorResponseBody = await response.json();
      
      expect(errorResponseBody).toHaveProperty('error');
      console.log('✅ Error response successfully parsed as JSON');
      
      // Verify we can stringify the error response
      expect(() => {
        JSON.stringify(errorResponseBody);
      }).not.toThrow();
    });

    test(`${tags.api} handle invalid date ranges`, async ({ apiContext, testData }) => {
      const invalidDateAssignment = {
        project_id: testData.projects[0]?.id || 'test-project-id',
        person_id: testData.people[0]?.id || 'test-person-id',
        role_id: testData.roles[0]?.id || 'test-role-id',
        allocation_percentage: 50,
        start_date: '2024-01-01',
        end_date: '2023-12-31', // End before start
        assignment_date_mode: 'fixed'
      };

      const response = await apiContext.post('/api/assignments', {
        data: invalidDateAssignment
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
      
      const errorResponse = await response.json();
      expect(errorResponse).toHaveProperty('error');
      
      // Verify no circular references
      expect(() => JSON.stringify(errorResponse)).not.toThrow();
    });
  });

  test.describe('Batch Operation Validation', () => {
    test(`${tags.api} handle bulk assignment operations`, async ({ apiContext, testData }) => {
      // Get assignments for a person
      const personId = testData.people[0]?.id;
      if (!personId) {
        test.skip('No test person available');
      }

      const response = await apiContext.get(`/api/people/${personId}/assignments`);
      
      expect(response.ok()).toBeTruthy();
      
      const responseBody = await response.json();
      
      // Verify structure
      expect(responseBody).toHaveProperty('data');
      expect(Array.isArray(responseBody.data)).toBeTruthy();
      
      // Verify no circular references in array response
      expect(() => JSON.stringify(responseBody)).not.toThrow();
      
      // If assignments exist, verify their structure
      if (responseBody.data.length > 0) {
        const firstAssignment = responseBody.data[0];
        
        // Verify assignment has expected properties
        expect(firstAssignment).toHaveProperty('id');
        expect(firstAssignment).toHaveProperty('project_id');
        expect(firstAssignment).toHaveProperty('person_id');
        expect(firstAssignment).toHaveProperty('allocation_percentage');
      }
    });
  });

  test.describe('Update Operation Validation', () => {
    test(`${tags.api} handle assignment updates without circular references`, async ({ 
      apiContext, 
      testData 
    }) => {
      // Create an assignment first
      const assignmentData = {
        project_id: testData.projects[0]?.id || 'test-project-id',
        person_id: testData.people[0]?.id || 'test-person-id',
        role_id: testData.roles[0]?.id || 'test-role-id',
        allocation_percentage: 30,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignment_date_mode: 'fixed'
      };

      const createResponse = await apiContext.post('/api/assignments', {
        data: assignmentData
      });
      
      const createdAssignment = (await createResponse.json()).data;

      // Update the assignment
      const updateData = {
        allocation_percentage: 75,
        notes: 'Updated via API contract test'
      };

      const updateResponse = await apiContext.put(`/api/assignments/${createdAssignment.id}`, {
        data: updateData
      });

      expect(updateResponse.ok()).toBeTruthy();
      
      const updatedAssignment = await updateResponse.json();
      
      // Verify no circular references
      expect(() => JSON.stringify(updatedAssignment)).not.toThrow();
      
      // Verify update was applied
      expect(updatedAssignment.data.allocation_percentage).toBe(75);
      expect(updatedAssignment.data.notes).toBe('Updated via API contract test');

      // Cleanup
      await apiContext.delete(`/api/assignments/${createdAssignment.id}`);
    });
  });
});