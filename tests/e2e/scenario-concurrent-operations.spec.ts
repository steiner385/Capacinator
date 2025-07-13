import { test, expect } from '@playwright/test';
import { generateTestData, cleanupTestData } from './helpers/test-data-generator.ts';

/**
 * Critical E2E tests for concurrent scenario operations.
 * These tests ensure that multiple users can safely work with scenarios simultaneously
 * without causing database corruption, race conditions, or data loss.
 */
test.describe('Concurrent Scenario Operations', () => {
  let testData: any;

  test.beforeAll(async () => {
    testData = await generateTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.describe('Concurrent Scenario Creation', () => {
    test('should handle multiple users creating scenarios simultaneously', async ({ browser }) => {
      // Create multiple browser contexts to simulate different users
      const contexts = await Promise.all(
        Array.from({ length: 3 }, () => browser.newContext())
      );
      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );

      // Simulate concurrent scenario creation
      const createOperations = pages.map(async (page, index) => {
        try {
          const response = await page.request.post('/api/scenarios', {
            data: {
              name: `Concurrent Scenario ${index}`,
              description: `Created by user ${index}`,
              created_by: testData.users[index % testData.users.length].id,
              scenario_type: 'branch',
              parent_scenario_id: 'baseline-0000-0000-0000-000000000000'
            }
          });
          
          const scenario = await response.json();
          return { success: response.status() === 201, scenario, index };
        } catch (error) {
          return { success: false, error: error.message, index };
        }
      });

      const results = await Promise.all(createOperations);
      
      // All scenarios should be created successfully
      const successful = results.filter(r => r.success);
      expect(successful.length).toBe(3);

      // Verify all scenarios have unique IDs
      const scenarioIds = new Set(successful.map(r => r.scenario.id));
      expect(scenarioIds.size).toBe(3);

      // Verify scenarios can be retrieved
      const listResponse = await pages[0].request.get('/api/scenarios');
      const scenarios = await listResponse.json();
      
      // Should include baseline + 3 new scenarios
      expect(scenarios.length).toBeGreaterThanOrEqual(4);

      // Cleanup contexts
      await Promise.all(contexts.map(context => context.close()));
    });

    test('should handle rapid scenario creation from same parent', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Create parent scenario
      const parentResponse = await page.request.post('/api/scenarios', {
        data: {
          name: 'Rapid Parent',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const parent = await parentResponse.json();

      // Create multiple child scenarios rapidly
      const rapidCreatePromises = Array.from({ length: 5 }, (_, i) =>
        page.request.post('/api/scenarios', {
          data: {
            name: `Rapid Child ${i}`,
            parent_scenario_id: parent.id,
            created_by: testData.users[0].id,
            scenario_type: 'branch'
          }
        })
      );

      const results = await Promise.allSettled(rapidCreatePromises);
      
      // All should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(5);

      // Verify parent-child relationships
      const parentDetail = await page.request.get(`/api/scenarios/${parent.id}`);
      const parentData = await parentDetail.json();
      
      expect(parentData.child_scenarios).toBeDefined();
      expect(parentData.child_scenarios.length).toBe(5);

      await context.close();
    });
  });

  test.describe('Concurrent Assignment Modifications', () => {
    test('should handle multiple users modifying same scenario assignments', async ({ browser }) => {
      // Create scenario for concurrent modification
      const context = await browser.newContext();
      const setupPage = await context.newPage();
      
      const scenarioResponse = await setupPage.request.post('/api/scenarios', {
        data: {
          name: 'Concurrent Assignments Test',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Create multiple browser contexts for concurrent users
      const userContexts = await Promise.all(
        Array.from({ length: 3 }, () => browser.newContext())
      );
      const userPages = await Promise.all(
        userContexts.map(ctx => ctx.newPage())
      );

      // Each user adds different assignments to the same scenario
      const assignmentOperations = userPages.map(async (page, userIndex) => {
        const assignments = [];
        
        // Each user creates multiple assignments
        for (let i = 0; i < 3; i++) {
          const assignmentIndex = userIndex * 3 + i;
          try {
            const response = await page.request.post(`/api/scenarios/${scenario.id}/assignments`, {
              data: {
                project_id: testData.projects[assignmentIndex % testData.projects.length].id,
                person_id: testData.people[assignmentIndex % testData.people.length].id,
                role_id: testData.roles[assignmentIndex % testData.roles.length].id,
                allocation_percentage: 50 + (userIndex * 10),
                assignment_date_mode: 'project'
              }
            });
            
            if (response.status() === 200) {
              assignments.push(await response.json());
            }
          } catch (error) {
            console.error(`User ${userIndex} assignment ${i} failed:`, error.message);
          }
        }
        
        return { userIndex, assignments: assignments.length };
      });

      const results = await Promise.all(assignmentOperations);
      
      // Verify assignments were created
      const totalAssignments = results.reduce((sum, r) => sum + r.assignments, 0);
      expect(totalAssignments).toBeGreaterThan(0);

      // Verify scenario has all assignments without corruption
      const finalAssignments = await setupPage.request.get(`/api/scenarios/${scenario.id}/assignments`);
      const assignments = await finalAssignments.json();
      
      expect(Array.isArray(assignments)).toBe(true);
      expect(assignments.length).toBe(totalAssignments);

      // Verify no duplicate assignments
      const assignmentKeys = new Set();
      for (const assignment of assignments) {
        const key = `${assignment.project_id}-${assignment.person_id}-${assignment.role_id}`;
        expect(assignmentKeys.has(key)).toBe(false);
        assignmentKeys.add(key);
      }

      // Cleanup
      await Promise.all([context.close(), ...userContexts.map(ctx => ctx.close())]);
    });

    test('should handle concurrent assignment updates safely', async ({ browser }) => {
      const context = await browser.newContext();
      const setupPage = await context.newPage();

      // Create scenario with initial assignment
      const scenarioResponse = await setupPage.request.post('/api/scenarios', {
        data: {
          name: 'Concurrent Updates Test',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Create initial assignment
      const assignmentResponse = await setupPage.request.post(`/api/scenarios/${scenario.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project'
        }
      });
      const assignment = await assignmentResponse.json();

      // Create concurrent update operations
      const updateContexts = await Promise.all(
        Array.from({ length: 3 }, () => browser.newContext())
      );
      const updatePages = await Promise.all(
        updateContexts.map(ctx => ctx.newPage())
      );

      // Concurrent updates to the same assignment
      const updateOperations = updatePages.map(async (page, index) => {
        try {
          const response = await page.request.post(`/api/scenarios/${scenario.id}/assignments`, {
            data: {
              project_id: testData.projects[0].id,
              person_id: testData.people[0].id,
              role_id: testData.roles[0].id,
              allocation_percentage: 60 + (index * 5), // Different values
              assignment_date_mode: 'project'
            }
          });
          
          return { success: response.status() === 200, index, value: 60 + (index * 5) };
        } catch (error) {
          return { success: false, index, error: error.message };
        }
      });

      const results = await Promise.all(updateOperations);
      
      // At least one update should succeed
      const successful = results.filter(r => r.success);
      expect(successful.length).toBeGreaterThan(0);

      // Final state should be consistent
      const finalAssignments = await setupPage.request.get(`/api/scenarios/${scenario.id}/assignments`);
      const finalData = await finalAssignments.json();
      
      expect(finalData.length).toBe(1); // Should still be only one assignment
      expect(finalData[0].allocation_percentage).toBeGreaterThanOrEqual(60);
      expect(finalData[0].allocation_percentage).toBeLessThanOrEqual(70);

      // Cleanup
      await Promise.all([context.close(), ...updateContexts.map(ctx => ctx.close())]);
    });
  });

  test.describe('Concurrent Merge Operations', () => {
    test('should prevent simultaneous merges of same scenario', async ({ browser }) => {
      const setupContext = await browser.newContext();
      const setupPage = await setupContext.newPage();

      // Create parent and child scenarios
      const parentResponse = await setupPage.request.post('/api/scenarios', {
        data: {
          name: 'Merge Parent',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const parent = await parentResponse.json();

      const childResponse = await setupPage.request.post('/api/scenarios', {
        data: {
          name: 'Merge Child',
          parent_scenario_id: parent.id,
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const child = await childResponse.json();

      // Add assignment to child
      await setupPage.request.post(`/api/scenarios/${child.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75,
          assignment_date_mode: 'project'
        }
      });

      // Create multiple contexts for concurrent merge attempts
      const mergeContexts = await Promise.all(
        Array.from({ length: 3 }, () => browser.newContext())
      );
      const mergePages = await Promise.all(
        mergeContexts.map(ctx => ctx.newPage())
      );

      // Attempt concurrent merges of the same scenario
      const mergeOperations = mergePages.map(async (page, index) => {
        try {
          const response = await page.request.post(`/api/scenarios/${child.id}/merge`, {
            data: { resolve_conflicts_as: 'use_source' }
          });
          
          const result = await response.json();
          return { 
            success: response.status() === 200 && result.success, 
            index, 
            response: result 
          };
        } catch (error) {
          return { success: false, index, error: error.message };
        }
      });

      const results = await Promise.all(mergeOperations);
      
      // Only one merge should succeed (or all should handle gracefully)
      const successful = results.filter(r => r.success);
      expect(successful.length).toBeLessThanOrEqual(1);

      // Parent scenario should be in consistent state
      const parentState = await setupPage.request.get(`/api/scenarios/${parent.id}/assignments`);
      const parentAssignments = await parentState.json();
      
      expect(Array.isArray(parentAssignments)).toBe(true);
      
      // If merge succeeded, parent should have the assignment
      if (successful.length === 1) {
        expect(parentAssignments.length).toBe(1);
        expect(parentAssignments[0].allocation_percentage).toBe(75);
      }

      // Child scenario should be marked as merged if merge succeeded
      if (successful.length === 1) {
        const childState = await setupPage.request.get(`/api/scenarios/${child.id}`);
        const childData = await childState.json();
        expect(childData.status).toBe('merged');
      }

      // Cleanup
      await Promise.all([setupContext.close(), ...mergeContexts.map(ctx => ctx.close())]);
    });

    test('should handle cascade merge operations safely', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Create hierarchy: baseline -> parent -> child1, child2
      const parentResponse = await page.request.post('/api/scenarios', {
        data: {
          name: 'Cascade Parent',
          parent_scenario_id: 'baseline-0000-0000-0000-000000000000',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const parent = await parentResponse.json();

      const child1Response = await page.request.post('/api/scenarios', {
        data: {
          name: 'Cascade Child 1',
          parent_scenario_id: parent.id,
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const child1 = await child1Response.json();

      const child2Response = await page.request.post('/api/scenarios', {
        data: {
          name: 'Cascade Child 2',
          parent_scenario_id: parent.id,
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const child2 = await child2Response.json();

      // Add different assignments to each child
      await page.request.post(`/api/scenarios/${child1.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 60,
          assignment_date_mode: 'project'
        }
      });

      await page.request.post(`/api/scenarios/${child2.id}/assignments`, {
        data: {
          project_id: testData.projects[1].id,
          person_id: testData.people[1].id,
          role_id: testData.roles[1].id,
          allocation_percentage: 80,
          assignment_date_mode: 'project'
        }
      });

      // Attempt to merge children to parent, then parent to baseline
      const merge1Response = await page.request.post(`/api/scenarios/${child1.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });
      expect(merge1Response.status()).toBe(200);

      const merge2Response = await page.request.post(`/api/scenarios/${child2.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });
      expect(merge2Response.status()).toBe(200);

      // Now merge parent to baseline
      const parentMergeResponse = await page.request.post(`/api/scenarios/${parent.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });
      expect(parentMergeResponse.status()).toBe(200);

      // Verify baseline has all assignments
      const baselineAssignments = await page.request.get('/api/scenarios/baseline-0000-0000-0000-000000000000/assignments');
      const assignments = await baselineAssignments.json();
      
      // Should have at least the 2 assignments from children
      const relevantAssignments = assignments.filter((a: any) => 
        (a.project_id === testData.projects[0].id && a.allocation_percentage === 60) ||
        (a.project_id === testData.projects[1].id && a.allocation_percentage === 80)
      );
      
      expect(relevantAssignments.length).toBe(2);

      await context.close();
    });
  });

  test.describe('Resource Contention and Locking', () => {
    test('should handle high-frequency scenario operations without deadlock', async ({ browser }) => {
      const contexts = await Promise.all(
        Array.from({ length: 5 }, () => browser.newContext())
      );
      const pages = await Promise.all(
        contexts.map(ctx => ctx.newPage())
      );

      // Create base scenario that all operations will interact with
      const baseResponse = await pages[0].request.post('/api/scenarios', {
        data: {
          name: 'High Frequency Base',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const baseScenario = await baseResponse.json();

      // Define high-frequency operations
      const operations = pages.map(async (page, pageIndex) => {
        const pageOperations = [];
        
        // Each page performs rapid operations
        for (let i = 0; i < 10; i++) {
          const operationType = i % 4;
          
          try {
            if (operationType === 0) {
              // Create child scenario
              const childResponse = await page.request.post('/api/scenarios', {
                data: {
                  name: `HF Child ${pageIndex}-${i}`,
                  parent_scenario_id: baseScenario.id,
                  created_by: testData.users[pageIndex % testData.users.length].id,
                  scenario_type: 'branch'
                }
              });
              pageOperations.push({ type: 'create', success: childResponse.status() === 201 });
              
            } else if (operationType === 1) {
              // Add assignment to base scenario
              const assignmentResponse = await page.request.post(`/api/scenarios/${baseScenario.id}/assignments`, {
                data: {
                  project_id: testData.projects[(pageIndex + i) % testData.projects.length].id,
                  person_id: testData.people[(pageIndex + i) % testData.people.length].id,
                  role_id: testData.roles[(pageIndex + i) % testData.roles.length].id,
                  allocation_percentage: 30 + (pageIndex * 5) + i,
                  assignment_date_mode: 'project'
                }
              });
              pageOperations.push({ type: 'assignment', success: assignmentResponse.status() === 200 });
              
            } else if (operationType === 2) {
              // List scenarios
              const listResponse = await page.request.get('/api/scenarios');
              pageOperations.push({ type: 'list', success: listResponse.status() === 200 });
              
            } else {
              // Get scenario details
              const detailResponse = await page.request.get(`/api/scenarios/${baseScenario.id}`);
              pageOperations.push({ type: 'detail', success: detailResponse.status() === 200 });
            }
          } catch (error) {
            pageOperations.push({ type: 'error', success: false, error: error.message });
          }
        }
        
        return { pageIndex, operations: pageOperations };
      });

      const results = await Promise.all(operations);
      
      // Calculate success rates
      const totalOperations = results.reduce((sum, r) => sum + r.operations.length, 0);
      const successfulOperations = results.reduce(
        (sum, r) => sum + r.operations.filter(op => op.success).length, 
        0
      );
      
      // Should have high success rate (allow some failures due to contention)
      const successRate = successfulOperations / totalOperations;
      expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate

      // Database should remain accessible
      const healthCheck = await pages[0].request.get('/api/health');
      expect(healthCheck.status()).toBe(200);

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('should maintain consistency under memory pressure', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Create many scenarios to simulate memory pressure
      const scenarioPromises = [];
      const targetCount = 50;

      for (let i = 0; i < targetCount; i++) {
        scenarioPromises.push(
          page.request.post('/api/scenarios', {
            data: {
              name: `Memory Pressure Scenario ${i}`,
              created_by: testData.users[i % testData.users.length].id,
              scenario_type: 'branch',
              description: `Large description text that might consume memory: ${'x'.repeat(1000)}`
            }
          })
        );
      }

      // Execute in batches to avoid overwhelming the system
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < scenarioPromises.length; i += batchSize) {
        const batch = scenarioPromises.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch);
        results.push(...batchResults);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Count successful creations
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status() === 201
      );
      
      // Should create most scenarios successfully
      expect(successful.length).toBeGreaterThan(targetCount * 0.7);

      // Verify database integrity
      const listResponse = await page.request.get('/api/scenarios');
      expect(listResponse.status()).toBe(200);
      
      const scenarios = await listResponse.json();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(1); // At least baseline + some created

      await context.close();
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover gracefully from transient errors', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Simulate transient errors by rapidly creating and deleting scenarios
      const operations = [];
      const scenarioIds = [];

      // Create scenarios
      for (let i = 0; i < 5; i++) {
        try {
          const response = await page.request.post('/api/scenarios', {
            data: {
              name: `Transient Test ${i}`,
              created_by: testData.users[0].id,
              scenario_type: 'branch'
            }
          });
          
          if (response.status() === 201) {
            const scenario = await response.json();
            scenarioIds.push(scenario.id);
            operations.push({ type: 'create', success: true });
          }
        } catch (error) {
          operations.push({ type: 'create', success: false });
        }
      }

      // Rapidly delete some scenarios
      for (let i = 0; i < Math.min(3, scenarioIds.length); i++) {
        try {
          const response = await page.request.delete(`/api/scenarios/${scenarioIds[i]}`);
          operations.push({ type: 'delete', success: response.status() === 200 });
        } catch (error) {
          operations.push({ type: 'delete', success: false });
        }
      }

      // Verify system remains stable
      const healthResponse = await page.request.get('/api/health');
      expect(healthResponse.status()).toBe(200);

      const listResponse = await page.request.get('/api/scenarios');
      expect(listResponse.status()).toBe(200);

      await context.close();
    });

    test('should handle network interruption scenarios', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Create scenario
      const scenarioResponse = await page.request.post('/api/scenarios', {
        data: {
          name: 'Network Test',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Start an assignment operation
      const assignmentPromise = page.request.post(`/api/scenarios/${scenario.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project'
        }
      });

      // Simulate network interruption by immediately trying another operation
      const conflictingPromise = page.request.post(`/api/scenarios/${scenario.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75, // Different value
          assignment_date_mode: 'project'
        }
      });

      const [result1, result2] = await Promise.allSettled([assignmentPromise, conflictingPromise]);
      
      // At least one should succeed
      const successes = [result1, result2].filter(r => 
        r.status === 'fulfilled' && r.value.status() === 200
      );
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // Final state should be consistent
      const finalAssignments = await page.request.get(`/api/scenarios/${scenario.id}/assignments`);
      const assignments = await finalAssignments.json();
      
      expect(assignments.length).toBe(1); // Should have exactly one assignment
      expect([50, 75]).toContain(assignments[0].allocation_percentage);

      await context.close();
    });
  });
});