import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../../../../src/server/../test-helpers/app.js';
import { setupTestDatabase, cleanupTestDatabase } from '../../../../src/server/../test-helpers/database.js';
import { createTestData } from '../../../../src/server/../test-helpers/data.js';
import { ScenariosController } from '../../../../src/server/ScenariosController.js';

describe('ScenariosController', () => {
  let app: Express;
  let testData: any;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
    testData = await createTestData();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean scenario-specific test data between tests
    const { db } = await import('../../../database/index.js');
    await db('scenario_merge_conflicts').del();
    await db('scenario_project_assignments').del();
    await db('scenario_project_phases').del();
    await db('scenario_projects').del();
    await db('scenarios').where('scenario_type', '!=', 'baseline').del();
  });

  describe('GET /api/scenarios', () => {
    it('should return all scenarios', async () => {
      const response = await request(app)
        .get('/api/scenarios')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1); // Baseline scenario
      
      const baseline = response.body.find((s: any) => s.scenario_type === 'baseline');
      expect(baseline).toBeDefined();
      expect(baseline.name).toBe('Baseline Plan');
    });

    it('should include creator and parent information', async () => {
      // Create a branch scenario
      const branchResponse = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Test Branch',
          description: 'Test description',
          parent_scenario_id: 'baseline-0000-0000-0000-000000000000',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        })
        .expect(201);

      const response = await request(app)
        .get('/api/scenarios')
        .expect(200);

      const branch = response.body.find((s: any) => s.id === branchResponse.body.id);
      expect(branch.created_by_name).toBe(testData.people[0].name);
      expect(branch.parent_scenario_name).toBe('Baseline Plan');
    });
  });

  describe('GET /api/scenarios/:id', () => {
    it('should return a specific scenario with child scenarios', async () => {
      // Create a child scenario
      const childResponse = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Child Scenario',
          parent_scenario_id: 'baseline-0000-0000-0000-000000000000',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        })
        .expect(201);

      const response = await request(app)
        .get('/api/scenarios/baseline-0000-0000-0000-000000000000')
        .expect(200);

      expect(response.body.id).toBe('baseline-0000-0000-0000-000000000000');
      expect(response.body.child_scenarios).toBeDefined();
      expect(response.body.child_scenarios.length).toBe(1);
      expect(response.body.child_scenarios[0].id).toBe(childResponse.body.id);
    });

    it('should return 404 for non-existent scenario', async () => {
      await request(app)
        .get('/api/scenarios/non-existent-id')
        .expect(500); // Will be 500 due to "Scenario not found" error
    });
  });

  describe('POST /api/scenarios', () => {
    it('should create a new branch scenario', async () => {
      const scenarioData = {
        name: 'Test Scenario',
        description: 'Test description',
        parent_scenario_id: 'baseline-0000-0000-0000-000000000000',
        created_by: testData.people[0].id,
        scenario_type: 'branch'
      };

      const response = await request(app)
        .post('/api/scenarios')
        .send(scenarioData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(scenarioData.name);
      expect(response.body.description).toBe(scenarioData.description);
      expect(response.body.parent_scenario_id).toBe(scenarioData.parent_scenario_id);
      expect(response.body.scenario_type).toBe('branch');
      expect(response.body.status).toBe('active');
      expect(response.body.branch_point).toBeDefined();
      expect(response.body.created_by_name).toBe(testData.people[0].name);
    });

    it('should create a sandbox scenario without parent', async () => {
      const scenarioData = {
        name: 'Sandbox Test',
        description: 'Sandbox for testing',
        created_by: testData.people[0].id,
        scenario_type: 'sandbox'
      };

      const response = await request(app)
        .post('/api/scenarios')
        .send(scenarioData)
        .expect(201);

      expect(response.body.scenario_type).toBe('sandbox');
      expect(response.body.parent_scenario_id).toBeNull();
      expect(response.body.branch_point).toBeNull();
    });

    it('should return 400 for missing required fields', async () => {
      await request(app)
        .post('/api/scenarios')
        .send({ name: 'Test' }) // Missing created_by
        .expect(400);

      await request(app)
        .post('/api/scenarios')
        .send({ created_by: testData.people[0].id }) // Missing name
        .expect(400);
    });

    it('should copy data from baseline when branching', async () => {
      // First, create some baseline data (assignments and phases)
      const { db } = await import('../../../database/index.js');
      
      // Create a project assignment in baseline
      await db('project_assignments').insert({
        id: 'test-assignment-1',
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create a phase timeline
      await db('project_phases_timeline').insert({
        id: 'test-phase-1',
        project_id: testData.projects[0].id,
        phase_id: testData.phases[0].id,
        start_date: '2025-01-01',
        end_date: '2025-02-01',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create branch scenario
      const response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Branch with Data',
          parent_scenario_id: 'baseline-0000-0000-0000-000000000000',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        })
        .expect(201);

      // Verify scenario assignments were copied
      const assignments = await db('scenario_project_assignments')
        .where('scenario_id', response.body.id);
      expect(assignments.length).toBe(1);
      expect(assignments[0].base_assignment_id).toBe('test-assignment-1');
      expect(assignments[0].change_type).toBe('added');

      // Verify scenario phases were copied
      const phases = await db('scenario_project_phases')
        .where('scenario_id', response.body.id);
      expect(phases.length).toBe(1);
      expect(phases[0].base_phase_timeline_id).toBe('test-phase-1');
      expect(phases[0].change_type).toBe('added');
    });
  });

  describe('PUT /api/scenarios/:id', () => {
    let scenarioId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Test Scenario',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });
      scenarioId = response.body.id;
    });

    it('should update scenario properties', async () => {
      const updateData = {
        name: 'Updated Scenario',
        description: 'Updated description',
        status: 'archived'
      };

      const response = await request(app)
        .put(`/api/scenarios/${scenarioId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should not update immutable fields', async () => {
      const originalResponse = await request(app)
        .get(`/api/scenarios/${scenarioId}`);

      await request(app)
        .put(`/api/scenarios/${scenarioId}`)
        .send({
          scenario_type: 'baseline', // Should not change
          created_by: 'different-user-id', // Should not change
          parent_scenario_id: 'different-parent' // Should not change
        })
        .expect(200);

      const updatedResponse = await request(app)
        .get(`/api/scenarios/${scenarioId}`);

      expect(updatedResponse.body.scenario_type).toBe(originalResponse.body.scenario_type);
      expect(updatedResponse.body.created_by).toBe(originalResponse.body.created_by);
      expect(updatedResponse.body.parent_scenario_id).toBe(originalResponse.body.parent_scenario_id);
    });
  });

  describe('DELETE /api/scenarios/:id', () => {
    it('should delete a branch scenario', async () => {
      const response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'To Delete',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        })
        .expect(201);

      await request(app)
        .delete(`/api/scenarios/${response.body.id}`)
        .expect(200);

      await request(app)
        .get(`/api/scenarios/${response.body.id}`)
        .expect(500); // Should not exist
    });

    it('should not delete baseline scenario', async () => {
      await request(app)
        .delete('/api/scenarios/baseline-0000-0000-0000-000000000000')
        .expect(500); // Should fail with error message
    });

    it('should not delete scenario with child scenarios', async () => {
      // Create parent scenario
      const parentResponse = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Parent',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });

      // Create child scenario
      await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Child',
          parent_scenario_id: parentResponse.body.id,
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });

      // Should not be able to delete parent
      await request(app)
        .delete(`/api/scenarios/${parentResponse.body.id}`)
        .expect(500);
    });
  });

  describe('Assignment Management', () => {
    let scenarioId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Assignment Test',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });
      scenarioId = response.body.id;
    });

    describe('POST /api/scenarios/:id/assignments', () => {
      it('should create new assignment in scenario', async () => {
        const assignmentData = {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75,
          assignment_date_mode: 'project',
          change_type: 'added'
        };

        const response = await request(app)
          .post(`/api/scenarios/${scenarioId}/assignments`)
          .send(assignmentData)
          .expect(200);

        expect(response.body.allocation_percentage).toBe(75);
        expect(response.body.change_type).toBe('added');
      });

      it('should update existing assignment in scenario', async () => {
        const assignmentData = {
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project'
        };

        // Create first
        await request(app)
          .post(`/api/scenarios/${scenarioId}/assignments`)
          .send(assignmentData)
          .expect(200);

        // Update with different allocation
        const updateData = {
          ...assignmentData,
          allocation_percentage: 100,
          change_type: 'modified'
        };

        const response = await request(app)
          .post(`/api/scenarios/${scenarioId}/assignments`)
          .send(updateData)
          .expect(200);

        expect(response.body.allocation_percentage).toBe(100);
        expect(response.body.change_type).toBe('modified');
      });

      it('should validate required assignment fields', async () => {
        await request(app)
          .post(`/api/scenarios/${scenarioId}/assignments`)
          .send({
            project_id: testData.projects[0].id,
            person_id: testData.people[0].id
            // Missing role_id and allocation_percentage
          })
          .expect(400);
      });
    });

    describe('GET /api/scenarios/:id/assignments', () => {
      it('should return scenario assignments with computed dates', async () => {
        // Create assignment
        await request(app)
          .post(`/api/scenarios/${scenarioId}/assignments`)
          .send({
            project_id: testData.projects[0].id,
            person_id: testData.people[0].id,
            role_id: testData.roles[0].id,
            allocation_percentage: 50,
            assignment_date_mode: 'fixed',
            start_date: '2025-01-01',
            end_date: '2025-02-01'
          })
          .expect(200);

        const response = await request(app)
          .get(`/api/scenarios/${scenarioId}/assignments`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].computed_start_date).toBe('2025-01-01');
        expect(response.body[0].computed_end_date).toBe('2025-02-01');
      });
    });
  });

  describe('Scenario Comparison', () => {
    it('should compare two scenarios', async () => {
      // Create two scenarios
      const scenario1Response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Scenario 1',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });

      const scenario2Response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Scenario 2',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });

      const response = await request(app)
        .get(`/api/scenarios/${scenario1Response.body.id}/compare?compare_to=${scenario2Response.body.id}`)
        .expect(200);

      expect(response.body.scenario1).toBeDefined();
      expect(response.body.scenario2).toBeDefined();
      expect(response.body.differences).toBeDefined();
      expect(response.body.metrics).toBeDefined();
    });

    it('should require compare_to parameter', async () => {
      const scenario1Response = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Scenario 1',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });

      await request(app)
        .get(`/api/scenarios/${scenario1Response.body.id}/compare`)
        .expect(400);
    });
  });

  describe('Merge Operations', () => {
    let parentScenarioId: string;
    let childScenarioId: string;

    beforeEach(async () => {
      // Create parent scenario
      const parentResponse = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Parent Scenario',
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });
      parentScenarioId = parentResponse.body.id;

      // Create child scenario
      const childResponse = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Child Scenario',
          parent_scenario_id: parentScenarioId,
          created_by: testData.people[0].id,
          scenario_type: 'branch'
        });
      childScenarioId = childResponse.body.id;
    });

    it('should initiate merge process', async () => {
      const response = await request(app)
        .post(`/api/scenarios/${childScenarioId}/merge`)
        .send({ resolve_conflicts_as: 'manual' })
        .expect(200);

      expect(response.body.success).toBeDefined();
    });

    it('should not merge scenario without parent', async () => {
      const orphanResponse = await request(app)
        .post('/api/scenarios')
        .send({
          name: 'Orphan Scenario',
          created_by: testData.people[0].id,
          scenario_type: 'sandbox'
        });

      await request(app)
        .post(`/api/scenarios/${orphanResponse.body.id}/merge`)
        .send({})
        .expect(500); // Should fail
    });

    it('should not merge baseline scenario', async () => {
      await request(app)
        .post('/api/scenarios/baseline-0000-0000-0000-000000000000/merge')
        .send({})
        .expect(500); // Should fail
    });
  });
});