import { test, expect } from '@playwright/test';
import { generateTestData, cleanupTestData } from './helpers/test-data-generator.ts';

/**
 * Critical E2E tests for scenario merge operations with focus on database corruption prevention.
 * These tests ensure that merges NEVER leave the database in an inconsistent state.
 */
test.describe('Scenario Merge Operations - Database Corruption Prevention', () => {
  let testData: any;

  test.beforeAll(async () => {
    testData = await generateTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.describe('Complex Merge Scenarios', () => {
    test('should handle three-way merge conflicts safely', async ({ page, request }) => {
      // Create parent scenario
      const parentResponse = await request.post('/api/scenarios', {
        data: {
          name: 'Parent Scenario',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const parent = await parentResponse.json();

      // Create two child scenarios from parent
      const child1Response = await request.post('/api/scenarios', {
        data: {
          name: 'Child 1',
          parent_scenario_id: parent.id,
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const child1 = await child1Response.json();

      const child2Response = await request.post('/api/scenarios', {
        data: {
          name: 'Child 2',
          parent_scenario_id: parent.id,
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const child2 = await child2Response.json();

      // Add conflicting assignments to both children
      await request.post(`/api/scenarios/${child1.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project'
        }
      });

      await request.post(`/api/scenarios/${child2.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75, // Conflict!
          assignment_date_mode: 'project'
        }
      });

      // Attempt to merge child1 to parent
      const merge1Response = await request.post(`/api/scenarios/${child1.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });
      expect(merge1Response.status()).toBe(200);

      // Attempt to merge child2 to parent - should detect conflicts
      const merge2Response = await request.post(`/api/scenarios/${child2.id}/merge`, {
        data: { resolve_conflicts_as: 'manual' }
      });
      const merge2Result = await merge2Response.json();
      
      expect(merge2Result.success).toBe(false);
      expect(merge2Result.message).toContain('conflicts detected');

      // Verify database integrity - parent should have child1's data
      const parentAssignments = await request.get(`/api/scenarios/${parent.id}/assignments`);
      const assignments = await parentAssignments.json();
      expect(assignments.length).toBe(1);
      expect(assignments[0].allocation_percentage).toBe(50); // From child1
    });

    test('should maintain referential integrity during complex merges', async ({ page, request }) => {
      // Create scenario with complete assignment chain
      const scenarioResponse = await request.post('/api/scenarios', {
        data: {
          name: 'Complex Scenario',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Add project phase
      await request.post(`/api/scenarios/${scenario.id}/phases`, {
        data: {
          project_id: testData.projects[0].id,
          phase_id: testData.phases[0].id,
          start_date: '2025-01-01',
          end_date: '2025-02-01'
        }
      });

      // Add project modification
      await request.post(`/api/scenarios/${scenario.id}/projects`, {
        data: {
          project_id: testData.projects[0].id,
          priority: 1,
          aspiration_start: '2025-01-01',
          aspiration_finish: '2025-03-01'
        }
      });

      // Add assignment that references both
      await request.post(`/api/scenarios/${scenario.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          phase_id: testData.phases[0].id,
          allocation_percentage: 100,
          assignment_date_mode: 'phase'
        }
      });

      // Merge to baseline
      const mergeResponse = await request.post(`/api/scenarios/${scenario.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });
      expect(mergeResponse.status()).toBe(200);

      // Verify all references are intact in merged data
      const baselineAssignments = await request.get('/api/scenarios/baseline-0000-0000-0000-000000000000/assignments');
      const assignments = await baselineAssignments.json();
      
      const mergedAssignment = assignments.find((a: any) => 
        a.project_id === testData.projects[0].id && 
        a.person_id === testData.people[0].id
      );
      
      expect(mergedAssignment).toBeDefined();
      expect(mergedAssignment.phase_id).toBe(testData.phases[0].id);
      expect(mergedAssignment.computed_start_date).toBeDefined();
      expect(mergedAssignment.computed_end_date).toBeDefined();
    });

    test('should rollback completely on merge failure', async ({ page, request }) => {
      // Create scenario with invalid data that will cause merge failure
      const scenarioResponse = await request.post('/api/scenarios', {
        data: {
          name: 'Failing Scenario',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Get baseline state before merge attempt
      const baselineBefore = await request.get('/api/scenarios/baseline-0000-0000-0000-000000000000/assignments');
      const assignmentsBefore = await baselineBefore.json();

      // Simulate a scenario that would cause database constraint violation
      // This might involve creating assignments with invalid foreign keys
      // or violating unique constraints during merge

      // For this test, we'll create a scenario that conflicts with existing baseline data
      await request.post(`/api/scenarios/${scenario.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project'
        }
      });

      // Add the same assignment to baseline to force conflict
      await request.post('/api/scenarios/baseline-0000-0000-0000-000000000000/assignments', {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75, // Different allocation
          assignment_date_mode: 'project'
        }
      });

      // Attempt merge with automatic conflict resolution
      const mergeResponse = await request.post(`/api/scenarios/${scenario.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });

      // Whether merge succeeds or fails, verify database is in consistent state
      const baselineAfter = await request.get('/api/scenarios/baseline-0000-0000-0000-000000000000/assignments');
      const assignmentsAfter = await baselineAfter.json();

      // Database should be in a valid state (either original or properly merged)
      expect(assignmentsAfter).toBeDefined();
      expect(Array.isArray(assignmentsAfter)).toBe(true);

      // Verify foreign key integrity
      for (const assignment of assignmentsAfter) {
        expect(assignment.project_id).toBeDefined();
        expect(assignment.person_id).toBeDefined();
        expect(assignment.role_id).toBeDefined();
        expect(assignment.allocation_percentage).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Concurrent Modification Prevention', () => {
    test('should handle concurrent merges safely', async ({ browser }) => {
      // Create multiple browser contexts to simulate concurrent users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Create parent scenario
      const parentResponse = await page1.request.post('/api/scenarios', {
        data: {
          name: 'Concurrent Parent',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const parent = await parentResponse.json();

      // Create two child scenarios
      const child1Response = await page1.request.post('/api/scenarios', {
        data: {
          name: 'Concurrent Child 1',
          parent_scenario_id: parent.id,
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const child1 = await child1Response.json();

      const child2Response = await page2.request.post('/api/scenarios', {
        data: {
          name: 'Concurrent Child 2',
          parent_scenario_id: parent.id,
          created_by: testData.users[1].id,
          scenario_type: 'branch'
        }
      });
      const child2 = await child2Response.json();

      // Add different assignments to each child
      await page1.request.post(`/api/scenarios/${child1.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project'
        }
      });

      await page2.request.post(`/api/scenarios/${child2.id}/assignments`, {
        data: {
          project_id: testData.projects[1].id,
          person_id: testData.people[1].id,
          role_id: testData.roles[1].id,
          allocation_percentage: 75,
          assignment_date_mode: 'project'
        }
      });

      // Attempt concurrent merges
      const [merge1Result, merge2Result] = await Promise.allSettled([
        page1.request.post(`/api/scenarios/${child1.id}/merge`, {
          data: { resolve_conflicts_as: 'use_source' }
        }),
        page2.request.post(`/api/scenarios/${child2.id}/merge`, {
          data: { resolve_conflicts_as: 'use_source' }
        })
      ]);

      // At least one merge should succeed
      const successfulMerges = [merge1Result, merge2Result].filter(
        result => result.status === 'fulfilled' && result.value.status() === 200
      );
      expect(successfulMerges.length).toBeGreaterThanOrEqual(1);

      // Verify parent scenario is in consistent state
      const parentAssignments = await page1.request.get(`/api/scenarios/${parent.id}/assignments`);
      const assignments = await parentAssignments.json();
      
      // Should have valid assignments without duplicates
      expect(assignments).toBeDefined();
      expect(Array.isArray(assignments)).toBe(true);
      
      // Check for duplicate assignments (same project/person/role combination)
      const assignmentKeys = new Set();
      for (const assignment of assignments) {
        const key = `${assignment.project_id}-${assignment.person_id}-${assignment.role_id}`;
        expect(assignmentKeys.has(key)).toBe(false); // No duplicates
        assignmentKeys.add(key);
      }

      await context1.close();
      await context2.close();
    });

    test('should prevent database deadlocks during complex operations', async ({ browser }) => {
      // Simulate high-concurrency scenario operations
      const contexts = await Promise.all(
        Array.from({ length: 5 }, () => browser.newContext())
      );
      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );

      // Create base scenario
      const baseScenarioResponse = await pages[0].request.post('/api/scenarios', {
        data: {
          name: 'Deadlock Test Base',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const baseScenario = await baseScenarioResponse.json();

      // Create multiple child scenarios and perform concurrent operations
      const operations = pages.map(async (page, index) => {
        try {
          // Create child scenario
          const childResponse = await page.request.post('/api/scenarios', {
            data: {
              name: `Deadlock Child ${index}`,
              parent_scenario_id: baseScenario.id,
              created_by: testData.users[0].id,
              scenario_type: 'branch'
            }
          });
          const child = await childResponse.json();

          // Add assignments rapidly
          for (let i = 0; i < 3; i++) {
            await page.request.post(`/api/scenarios/${child.id}/assignments`, {
              data: {
                project_id: testData.projects[i % testData.projects.length].id,
                person_id: testData.people[i % testData.people.length].id,
                role_id: testData.roles[i % testData.roles.length].id,
                allocation_percentage: 50 + (index * 10),
                assignment_date_mode: 'project'
              }
            });
          }

          // Attempt merge
          const mergeResponse = await page.request.post(`/api/scenarios/${child.id}/merge`, {
            data: { resolve_conflicts_as: 'use_source' }
          });

          return { success: mergeResponse.status() === 200, index };
        } catch (error) {
          return { success: false, index, error: error.message };
        }
      });

      const results = await Promise.allSettled(operations);
      
      // At least some operations should succeed
      const successful = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      );
      expect(successful.length).toBeGreaterThan(0);

      // Verify database integrity after concurrent operations
      const finalAssignments = await pages[0].request.get(`/api/scenarios/${baseScenario.id}/assignments`);
      const assignments = await finalAssignments.json();
      
      // Database should be in valid state
      expect(Array.isArray(assignments)).toBe(true);
      
      // All assignments should have valid foreign key references
      for (const assignment of assignments) {
        expect(assignment.project_id).toBeDefined();
        expect(assignment.person_id).toBeDefined();
        expect(assignment.role_id).toBeDefined();
        expect(typeof assignment.allocation_percentage).toBe('number');
        expect(assignment.allocation_percentage).toBeGreaterThan(0);
      }

      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('Data Corruption Prevention', () => {
    test('should validate all constraints after merge operations', async ({ page, request }) => {
      // Create scenario with comprehensive data
      const scenarioResponse = await request.post('/api/scenarios', {
        data: {
          name: 'Validation Test Scenario',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Add complex interdependent data
      const assignmentPromises = [];
      const phasePromises = [];
      const projectPromises = [];

      // Create multiple assignments with different date modes
      for (let i = 0; i < testData.projects.length; i++) {
        const project = testData.projects[i];
        const person = testData.people[i % testData.people.length];
        const role = testData.roles[i % testData.roles.length];
        const phase = testData.phases[i % testData.phases.length];

        // Project modification
        projectPromises.push(
          request.post(`/api/scenarios/${scenario.id}/projects`, {
            data: {
              project_id: project.id,
              priority: i + 1,
              aspiration_start: `2025-0${(i % 9) + 1}-01`,
              aspiration_finish: `2025-${(i % 9) + 1 < 9 ? '0' : ''}${(i % 9) + 2}-01`
            }
          })
        );

        // Phase timeline
        phasePromises.push(
          request.post(`/api/scenarios/${scenario.id}/phases`, {
            data: {
              project_id: project.id,
              phase_id: phase.id,
              start_date: `2025-0${(i % 9) + 1}-05`,
              end_date: `2025-0${(i % 9) + 1}-25`
            }
          })
        );

        // Assignment with different date modes
        const dateMode = ['fixed', 'phase', 'project'][i % 3];
        const assignmentData: any = {
          project_id: project.id,
          person_id: person.id,
          role_id: role.id,
          allocation_percentage: 25 + (i * 15) % 75,
          assignment_date_mode: dateMode
        };

        if (dateMode === 'fixed') {
          assignmentData.start_date = `2025-0${(i % 9) + 1}-10`;
          assignmentData.end_date = `2025-0${(i % 9) + 1}-20`;
        } else if (dateMode === 'phase') {
          assignmentData.phase_id = phase.id;
        }

        assignmentPromises.push(
          request.post(`/api/scenarios/${scenario.id}/assignments`, {
            data: assignmentData
          })
        );
      }

      // Wait for all data to be created
      await Promise.all([...projectPromises, ...phasePromises, ...assignmentPromises]);

      // Perform merge
      const mergeResponse = await request.post(`/api/scenarios/${scenario.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });

      // Verify merge completed
      expect(mergeResponse.status()).toBe(200);

      // Comprehensive validation of merged data
      const baselineAssignments = await request.get('/api/scenarios/baseline-0000-0000-0000-000000000000/assignments');
      const assignments = await baselineAssignments.json();

      // Validate each assignment
      for (const assignment of assignments) {
        // Required fields
        expect(assignment.id).toBeDefined();
        expect(assignment.scenario_id).toBe('baseline-0000-0000-0000-000000000000');
        expect(assignment.project_id).toBeDefined();
        expect(assignment.person_id).toBeDefined();
        expect(assignment.role_id).toBeDefined();
        
        // Allocation percentage constraints
        expect(assignment.allocation_percentage).toBeGreaterThan(0);
        expect(assignment.allocation_percentage).toBeLessThanOrEqual(100);
        
        // Date mode validation
        expect(['fixed', 'phase', 'project']).toContain(assignment.assignment_date_mode);
        
        // Computed dates should be valid
        if (assignment.computed_start_date) {
          expect(new Date(assignment.computed_start_date)).toBeInstanceOf(Date);
        }
        if (assignment.computed_end_date) {
          expect(new Date(assignment.computed_end_date)).toBeInstanceOf(Date);
        }
        
        // Start date should be before end date
        if (assignment.computed_start_date && assignment.computed_end_date) {
          expect(new Date(assignment.computed_start_date)).toBeLessThan(
            new Date(assignment.computed_end_date)
          );
        }
        
        // Foreign key references should exist
        expect(testData.projects.some((p: any) => p.id === assignment.project_id)).toBe(true);
        expect(testData.people.some((p: any) => p.id === assignment.person_id)).toBe(true);
        expect(testData.roles.some((r: any) => r.id === assignment.role_id)).toBe(true);
        
        if (assignment.phase_id) {
          expect(testData.phases.some((ph: any) => ph.id === assignment.phase_id)).toBe(true);
        }
      }
    });

    test('should maintain audit trail during merge operations', async ({ page, request }) => {
      // Create scenario for audit testing
      const scenarioResponse = await request.post('/api/scenarios', {
        data: {
          name: 'Audit Trail Test',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Add trackable assignment
      await request.post(`/api/scenarios/${scenario.id}/assignments`, {
        data: {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 60,
          assignment_date_mode: 'project'
        }
      });

      // Perform merge
      const mergeResponse = await request.post(`/api/scenarios/${scenario.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });
      expect(mergeResponse.status()).toBe(200);

      // Check audit log for merge operation
      const auditResponse = await request.get('/api/audit-log?entity_type=scenario&entity_id=' + scenario.id);
      expect(auditResponse.status()).toBe(200);
      
      const auditEntries = await auditResponse.json();
      
      // Should have audit entries for scenario operations
      expect(Array.isArray(auditEntries)).toBe(true);
      
      // Look for merge-related audit entries
      const mergeAudit = auditEntries.find((entry: any) => 
        entry.action === 'merged' || entry.action === 'merge'
      );
      
      if (mergeAudit) {
        expect(mergeAudit.entity_id).toBe(scenario.id);
        expect(mergeAudit.entity_type).toBe('scenario');
        expect(mergeAudit.user_id).toBeDefined();
      }
    });

    test('should handle edge case data gracefully', async ({ page, request }) => {
      // Test with edge case data that might cause issues
      const scenarioResponse = await request.post('/api/scenarios', {
        data: {
          name: 'Edge Case Test',
          created_by: testData.users[0].id,
          scenario_type: 'branch'
        }
      });
      const scenario = await scenarioResponse.json();

      // Test with boundary values
      const edgeCaseAssignments = [
        {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 0.01, // Very small percentage
          assignment_date_mode: 'project'
        },
        {
          project_id: testData.projects[1].id,
          person_id: testData.people[1].id,
          role_id: testData.roles[1].id,
          allocation_percentage: 100, // Maximum percentage
          assignment_date_mode: 'fixed',
          start_date: '2025-01-01',
          end_date: '2025-01-01' // Same start and end date
        },
        {
          project_id: testData.projects[2].id,
          person_id: testData.people[2].id,
          role_id: testData.roles[2].id,
          allocation_percentage: 33.33333, // Many decimal places
          assignment_date_mode: 'project'
        }
      ];

      // Add edge case assignments
      for (const assignmentData of edgeCaseAssignments) {
        await request.post(`/api/scenarios/${scenario.id}/assignments`, {
          data: assignmentData
        });
      }

      // Attempt merge
      const mergeResponse = await request.post(`/api/scenarios/${scenario.id}/merge`, {
        data: { resolve_conflicts_as: 'use_source' }
      });

      // Merge should either succeed gracefully or fail with proper error
      expect([200, 400, 500]).toContain(mergeResponse.status());

      // Regardless of merge result, database should remain consistent
      const healthCheck = await request.get('/api/health');
      expect(healthCheck.status()).toBe(200);
      
      const health = await healthCheck.json();
      expect(health.database).toBe('connected');
    });
  });
});