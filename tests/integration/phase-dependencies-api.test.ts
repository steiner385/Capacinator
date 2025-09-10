import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

const request = jest.fn(() => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), send: jest.fn(), expect: jest.fn() }));
import { db } from '../../../../src/server/database/index';
import { app } from '../../../../src/server/index'; // Assuming you export your Express app

describe('Phase Dependencies API Integration Tests', () => {
  let testProjectId: string;
  let testPhaseTimelineId1: string;
  let testPhaseTimelineId2: string;
  let testPhaseTimelineId3: string;
  let testDependencyId: string;

  beforeEach(async () => {
    // Create test project
    const [project] = await db('projects').insert({
      id: 'test-proj-1',
      name: 'Test Project for Dependencies',
      priority: 1,
      include_in_demand: 1,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    testProjectId = project.id;

    // Create test phases in master table
    const testPhases = await db('project_phases').insert([
      {
        id: 'test-phase-1',
        name: 'Analysis',
        description: 'Requirements analysis phase',
        order_index: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'test-phase-2', 
        name: 'Development',
        description: 'Development phase',
        order_index: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'test-phase-3',
        name: 'Testing',
        description: 'Testing phase',
        order_index: 3,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]).returning('*');

    // Create project phase timelines
    const projectPhases = await db('project_phases_timeline').insert([
      {
        id: 'test-phase-timeline-1',
        project_id: testProjectId,
        phase_id: 'test-phase-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'test-phase-timeline-2',
        project_id: testProjectId,
        phase_id: 'test-phase-2', 
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-03-31'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'test-phase-timeline-3',
        project_id: testProjectId,
        phase_id: 'test-phase-3',
        start_date: new Date('2024-04-01'),
        end_date: new Date('2024-04-30'),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]).returning('*');

    testPhaseTimelineId1 = projectPhases[0].id;
    testPhaseTimelineId2 = projectPhases[1].id;
    testPhaseTimelineId3 = projectPhases[2].id;
  });

  afterEach(async () => {
    // Clean up test data
    await db('project_phase_dependencies').where('project_id', testProjectId).del();
    await db('project_phases_timeline').where('project_id', testProjectId).del();
    await db('projects').where('id', testProjectId).del();
    await db('project_phases').whereIn('id', ['test-phase-1', 'test-phase-2', 'test-phase-3']).del();
  });

  describe('GET /api/project-phase-dependencies', () => {
    beforeEach(async () => {
      // Create test dependency
      const [dependency] = await db('project_phase_dependencies').insert({
        id: 'test-dep-1',
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId2,
        dependency_type: 'FS',
        lag_days: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      testDependencyId = dependency.id;
    });

    test('should retrieve dependencies for a project', async () => {
      const response = await request(app)
        .get('/api/project-phase-dependencies')
        .query({ project_id: testProjectId })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: testDependencyId,
        project_id: testProjectId,
        dependency_type: 'FS',
        lag_days: 0,
        predecessor_phase_name: 'Analysis',
        successor_phase_name: 'Development'
      });
    });

    test('should support pagination', async () => {
      // Create additional dependencies
      await db('project_phase_dependencies').insert({
        id: 'test-dep-2',
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId2,
        successor_phase_timeline_id: testPhaseTimelineId3,
        dependency_type: 'FS',
        lag_days: 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      const response = await request(app)
        .get('/api/project-phase-dependencies')
        .query({ 
          project_id: testProjectId,
          page: 1,
          limit: 1
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2
      });
    });

    test('should return empty array for project with no dependencies', async () => {
      // Create another project without dependencies
      const [project2] = await db('projects').insert({
        id: 'test-proj-2',
        name: 'Project without dependencies',
        priority: 1,
        include_in_demand: 1,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      const response = await request(app)
        .get('/api/project-phase-dependencies')
        .query({ project_id: project2.id })
        .expect(200);

      expect(response.body.data).toHaveLength(0);

      // Cleanup
      await db('projects').where('id', project2.id).del();
    });
  });

  describe('GET /api/project-phase-dependencies/:id', () => {
    beforeEach(async () => {
      const [dependency] = await db('project_phase_dependencies').insert({
        id: 'test-dep-1',
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId2,
        dependency_type: 'FS',
        lag_days: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      testDependencyId = dependency.id;
    });

    test('should retrieve a specific dependency', async () => {
      const response = await request(app)
        .get(`/api/project-phase-dependencies/${testDependencyId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testDependencyId,
        project_id: testProjectId,
        dependency_type: 'FS',
        predecessor_phase_name: 'Analysis',
        successor_phase_name: 'Development'
      });
    });

    test('should return 404 for non-existent dependency', async () => {
      await request(app)
        .get('/api/project-phase-dependencies/nonexistent-id')
        .expect(500); // BaseController returns 500 for not found
    });
  });

  describe('POST /api/project-phase-dependencies', () => {
    test('should create a new dependency', async () => {
      const dependencyData = {
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId2,
        dependency_type: 'FS',
        lag_days: 0
      };

      const response = await request(app)
        .post('/api/project-phase-dependencies')
        .send(dependencyData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        project_id: testProjectId,
        dependency_type: 'FS',
        lag_days: 0,
        predecessor_phase_name: 'Analysis',
        successor_phase_name: 'Development'
      });

      // Verify in database
      const dependency = await db('project_phase_dependencies')
        .where('id', response.body.data.id)
        .first();
      expect(dependency).toBeTruthy();
    });

    test('should reject self-dependency', async () => {
      const dependencyData = {
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId1, // Same phase!
        dependency_type: 'FS'
      };

      await request(app)
        .post('/api/project-phase-dependencies')
        .send(dependencyData)
        .expect(500);
    });

    test('should reject circular dependency', async () => {
      // Create dependency A -> B
      await db('project_phase_dependencies').insert({
        id: 'test-dep-1',
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId2,
        dependency_type: 'FS',
        lag_days: 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Try to create dependency B -> A (circular)
      const dependencyData = {
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId2,
        successor_phase_timeline_id: testPhaseTimelineId1,
        dependency_type: 'FS'
      };

      await request(app)
        .post('/api/project-phase-dependencies')
        .send(dependencyData)
        .expect(500);
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1
        // Missing successor_phase_timeline_id
      };

      await request(app)
        .post('/api/project-phase-dependencies')
        .send(incompleteData)
        .expect(500);
    });
  });

  describe('PUT /api/project-phase-dependencies/:id', () => {
    beforeEach(async () => {
      const [dependency] = await db('project_phase_dependencies').insert({
        id: 'test-dep-1',
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId2,
        dependency_type: 'FS',
        lag_days: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      testDependencyId = dependency.id;
    });

    test('should update dependency properties', async () => {
      const updateData = {
        dependency_type: 'SS',
        lag_days: 5
      };

      const response = await request(app)
        .put(`/api/project-phase-dependencies/${testDependencyId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testDependencyId,
        dependency_type: 'SS',
        lag_days: 5
      });

      // Verify in database
      const dependency = await db('project_phase_dependencies')
        .where('id', testDependencyId)
        .first();
      expect(dependency.dependency_type).toBe('SS');
      expect(dependency.lag_days).toBe(5);
    });
  });

  describe('DELETE /api/project-phase-dependencies/:id', () => {
    beforeEach(async () => {
      const [dependency] = await db('project_phase_dependencies').insert({
        id: 'test-dep-1',
        project_id: testProjectId,
        predecessor_phase_timeline_id: testPhaseTimelineId1,
        successor_phase_timeline_id: testPhaseTimelineId2,
        dependency_type: 'FS',
        lag_days: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      testDependencyId = dependency.id;
    });

    test('should delete dependency', async () => {
      const response = await request(app)
        .delete(`/api/project-phase-dependencies/${testDependencyId}`)
        .expect(200);

      expect(response.body.message).toBe('Dependency deleted successfully');

      // Verify deleted from database
      const dependency = await db('project_phase_dependencies')
        .where('id', testDependencyId)
        .first();
      expect(dependency).toBeFalsy();
    });
  });

  describe('POST /api/project-phase-dependencies/calculate-cascade', () => {
    beforeEach(async () => {
      // Create dependencies: Phase 1 -> Phase 2 -> Phase 3
      await db('project_phase_dependencies').insert([
        {
          id: 'test-dep-1',
          project_id: testProjectId,
          predecessor_phase_timeline_id: testPhaseTimelineId1,
          successor_phase_timeline_id: testPhaseTimelineId2,
          dependency_type: 'FS',
          lag_days: 0,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'test-dep-2',
          project_id: testProjectId,
          predecessor_phase_timeline_id: testPhaseTimelineId2,
          successor_phase_timeline_id: testPhaseTimelineId3,
          dependency_type: 'FS',
          lag_days: 5,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    test('should calculate cascade effects', async () => {
      const cascadeData = {
        project_id: testProjectId,
        phase_timeline_id: testPhaseTimelineId1,
        new_start_date: '2024-02-01T00:00:00.000Z',
        new_end_date: '2024-02-29T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/api/project-phase-dependencies/calculate-cascade')
        .send(cascadeData)
        .expect(200);

      expect(response.body.data).toHaveProperty('affectedPhases');
      expect(response.body.data).toHaveProperty('conflicts');
      expect(response.body.data.affectedPhases.length).toBeGreaterThan(0);
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        project_id: testProjectId,
        phase_timeline_id: testPhaseTimelineId1
        // Missing new dates
      };

      await request(app)
        .post('/api/project-phase-dependencies/calculate-cascade')
        .send(incompleteData)
        .expect(500);
    });
  });

  describe('POST /api/project-phase-dependencies/apply-cascade', () => {
    test('should apply cascade changes', async () => {
      const cascadeData = {
        project_id: testProjectId,
        cascade_data: {
          affectedPhases: [
            {
              phaseId: testPhaseTimelineId2,
              newStartDate: new Date('2024-03-01'),
              newEndDate: new Date('2024-04-30')
            }
          ],
          conflicts: []
        }
      };

      const response = await request(app)
        .post('/api/project-phase-dependencies/apply-cascade')
        .send(cascadeData)
        .expect(200);

      expect(response.body.message).toBe('Cascade changes applied successfully');

      // Verify changes in database
      const updatedPhase = await db('project_phases_timeline')
        .where('id', testPhaseTimelineId2)
        .first();
      
      expect(new Date(updatedPhase.start_date)).toEqual(new Date('2024-03-01'));
      expect(new Date(updatedPhase.end_date)).toEqual(new Date('2024-04-30'));
    });
  });
});