import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

const request = jest.fn(() => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), send: jest.fn(), expect: jest.fn() }));
import { db } from '../../src/server/database/index.js';
// Mock express app
const app = { use: jest.fn(), get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
import { ProjectPhaseCascadeService } from '../../src/server/services/ProjectPhaseCascadeService.js';

describe('Phase Dependencies Performance Tests', () => {
  let testProjectId: string;
  let phaseTimelineIds: string[] = [];
  let cascadeService: ProjectPhaseCascadeService;

  beforeEach(async () => {
    cascadeService = new ProjectPhaseCascadeService(db);
    
    // Create test project
    const [project] = await db('projects').insert({
      id: 'perf-test-proj',
      name: 'Performance Test Project',
      priority: 1,
      include_in_demand: 1,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    testProjectId = project.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db('project_phase_dependencies').where('project_id', testProjectId).del();
    await db('project_phases_timeline').where('project_id', testProjectId).del();
    await db('projects').where('id', testProjectId).del();
    await db('project_phases').where('name', 'like', 'Perf Test Phase%').del();
  });

  describe('Large Project Performance', () => {
    test('should handle project with 50 phases efficiently', async () => {
      const numPhases = 50;
      
      // Create master phases
      const masterPhases = [];
      for (let i = 1; i <= numPhases; i++) {
        masterPhases.push({
          id: `perf-phase-${i}`,
          name: `Perf Test Phase ${i}`,
          description: `Performance test phase ${i}`,
          order_index: i,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      await db('project_phases').insert(masterPhases);

      // Create project phase timelines
      const projectPhases = [];
      const startDate = new Date('2024-01-01');
      
      for (let i = 1; i <= numPhases; i++) {
        const phaseStart = new Date(startDate);
        phaseStart.setDate(startDate.getDate() + (i - 1) * 30); // Each phase is 30 days apart
        
        const phaseEnd = new Date(phaseStart);
        phaseEnd.setDate(phaseStart.getDate() + 29); // Each phase is 30 days long
        
        const phaseTimelineId = `perf-phase-timeline-${i}`;
        phaseTimelineIds.push(phaseTimelineId);
        
        projectPhases.push({
          id: phaseTimelineId,
          project_id: testProjectId,
          phase_id: `perf-phase-${i}`,
          start_date: phaseStart,
          end_date: phaseEnd,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      await db('project_phases_timeline').insert(projectPhases);

      // Measure API performance for listing phases
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/project-phases')
        .query({ project_id: testProjectId })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data).toHaveLength(numPhases);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

      console.log(`API response time for ${numPhases} phases: ${responseTime}ms`);
    });

    test('should handle complex dependency chain efficiently', async () => {
      const numPhases = 20;
      
      // Create phases and dependencies in a chain: Phase 1 -> Phase 2 -> ... -> Phase N
      const masterPhases = [];
      const projectPhases = [];
      const dependencies = [];
      
      for (let i = 1; i <= numPhases; i++) {
        // Create master phase
        masterPhases.push({
          id: `chain-phase-${i}`,
          name: `Chain Phase ${i}`,
          description: `Chain phase ${i}`,
          order_index: i,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Create project phase timeline
        const phaseStart = new Date('2024-01-01');
        phaseStart.setDate(phaseStart.getDate() + (i - 1) * 30);
        
        const phaseEnd = new Date(phaseStart);
        phaseEnd.setDate(phaseStart.getDate() + 29);
        
        const phaseTimelineId = `chain-phase-timeline-${i}`;
        phaseTimelineIds.push(phaseTimelineId);
        
        projectPhases.push({
          id: phaseTimelineId,
          project_id: testProjectId,
          phase_id: `chain-phase-${i}`,
          start_date: phaseStart,
          end_date: phaseEnd,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Create dependency to previous phase (except for first phase)
        if (i > 1) {
          dependencies.push({
            id: `chain-dep-${i-1}-${i}`,
            project_id: testProjectId,
            predecessor_phase_timeline_id: `chain-phase-timeline-${i-1}`,
            successor_phase_timeline_id: phaseTimelineId,
            dependency_type: 'FS',
            lag_days: 0,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      await db('project_phases').insert(masterPhases);
      await db('project_phases_timeline').insert(projectPhases);
      await db('project_phase_dependencies').insert(dependencies);

      // Test cascade calculation performance
      const cascadeStartTime = Date.now();
      
      const result = await cascadeService.calculateCascade(
        testProjectId,
        'chain-phase-timeline-1',
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );

      const cascadeEndTime = Date.now();
      const cascadeTime = cascadeEndTime - cascadeStartTime;

      expect(result.affectedPhases.length).toBe(numPhases - 1); // All phases except the first
      expect(cascadeTime).toBeLessThan(5000); // Should calculate within 5 seconds

      console.log(`Cascade calculation time for ${numPhases} phases: ${cascadeTime}ms`);
    });

    test('should handle high dependency density efficiently', async () => {
      const numPhases = 10;
      
      // Create phases
      const masterPhases = [];
      const projectPhases = [];
      
      for (let i = 1; i <= numPhases; i++) {
        masterPhases.push({
          id: `dense-phase-${i}`,
          name: `Dense Phase ${i}`,
          description: `Dense phase ${i}`,
          order_index: i,
          created_at: new Date(),
          updated_at: new Date()
        });

        const phaseTimelineId = `dense-phase-timeline-${i}`;
        phaseTimelineIds.push(phaseTimelineId);
        
        projectPhases.push({
          id: phaseTimelineId,
          project_id: testProjectId,
          phase_id: `dense-phase-${i}`,
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await db('project_phases').insert(masterPhases);
      await db('project_phases_timeline').insert(projectPhases);

      // Create dense dependencies: each phase depends on all previous phases
      const dependencies = [];
      let dependencyCount = 0;
      
      for (let i = 2; i <= numPhases; i++) {
        for (let j = 1; j < i; j++) {
          dependencies.push({
            id: `dense-dep-${j}-${i}`,
            project_id: testProjectId,
            predecessor_phase_timeline_id: `dense-phase-timeline-${j}`,
            successor_phase_timeline_id: `dense-phase-timeline-${i}`,
            dependency_type: 'FS',
            lag_days: 0,
            created_at: new Date(),
            updated_at: new Date()
          });
          dependencyCount++;
        }
      }

      await db('project_phase_dependencies').insert(dependencies);

      // Test API performance with many dependencies
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/project-phase-dependencies')
        .query({ project_id: testProjectId })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data).toHaveLength(dependencyCount);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds

      console.log(`API response time for ${dependencyCount} dependencies: ${responseTime}ms`);
    });
  });

  describe('Database Query Performance', () => {
    test('should efficiently query dependencies with joins', async () => {
      const numPhases = 30;
      const numDependencies = 50;
      
      // Create test data
      const masterPhases = [];
      const projectPhases = [];
      
      for (let i = 1; i <= numPhases; i++) {
        masterPhases.push({
          id: `query-phase-${i}`,
          name: `Query Phase ${i}`,
          description: `Query phase ${i}`,
          order_index: i,
          created_at: new Date(),
          updated_at: new Date()
        });

        const phaseTimelineId = `query-phase-timeline-${i}`;
        phaseTimelineIds.push(phaseTimelineId);
        
        projectPhases.push({
          id: phaseTimelineId,
          project_id: testProjectId,
          phase_id: `query-phase-${i}`,
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await db('project_phases').insert(masterPhases);
      await db('project_phases_timeline').insert(projectPhases);

      // Create random dependencies
      const dependencies = [];
      for (let i = 1; i <= numDependencies; i++) {
        const predIndex = Math.floor(Math.random() * (numPhases - 1)) + 1;
        const succIndex = Math.min(predIndex + Math.floor(Math.random() * 5) + 1, numPhases);
        
        dependencies.push({
          id: `query-dep-${i}`,
          project_id: testProjectId,
          predecessor_phase_timeline_id: `query-phase-timeline-${predIndex}`,
          successor_phase_timeline_id: `query-phase-timeline-${succIndex}`,
          dependency_type: 'FS',
          lag_days: Math.floor(Math.random() * 10),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await db('project_phase_dependencies').insert(dependencies);

      // Measure complex query performance
      const queryStartTime = Date.now();
      
      const result = await db('project_phase_dependencies as ppd')
        .join('project_phases_timeline as pred', 'ppd.predecessor_phase_timeline_id', 'pred.id')
        .join('project_phases_timeline as succ', 'ppd.successor_phase_timeline_id', 'succ.id')
        .join('project_phases as pred_phase', 'pred.phase_id', 'pred_phase.id')
        .join('project_phases as succ_phase', 'succ.phase_id', 'succ_phase.id')
        .select(
          'ppd.*',
          'pred.start_date as predecessor_start_date',
          'pred.end_date as predecessor_end_date',
          'pred_phase.name as predecessor_phase_name',
          'succ.start_date as successor_start_date',
          'succ.end_date as successor_end_date',
          'succ_phase.name as successor_phase_name'
        )
        .where('ppd.project_id', testProjectId)
        .orderBy('pred.start_date');

      const queryEndTime = Date.now();
      const queryTime = queryEndTime - queryStartTime;

      expect(result).toHaveLength(numDependencies);
      expect(queryTime).toBeLessThan(1000); // Should query within 1 second

      console.log(`Database query time for ${numDependencies} dependencies with joins: ${queryTime}ms`);
    });
  });

  describe('Memory Usage', () => {
    test('should handle large datasets without excessive memory usage', async () => {
      const initialMemory = process.memoryUsage();
      
      const numPhases = 100;
      
      // Create large dataset
      const masterPhases = [];
      const projectPhases = [];
      
      for (let i = 1; i <= numPhases; i++) {
        masterPhases.push({
          id: `memory-phase-${i}`,
          name: `Memory Phase ${i}`,
          description: `Memory phase ${i} with some longer description to use more memory`,
          order_index: i,
          created_at: new Date(),
          updated_at: new Date()
        });

        projectPhases.push({
          id: `memory-phase-timeline-${i}`,
          project_id: testProjectId,
          phase_id: `memory-phase-${i}`,
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await db('project_phases').insert(masterPhases);
      await db('project_phases_timeline').insert(projectPhases);

      // Make API call
      await request(app)
        .get('/api/project-phases')
        .query({ project_id: testProjectId })
        .expect(200);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase for ${numPhases} phases: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple cascade calculations concurrently', async () => {
      const numPhases = 5;
      
      // Setup test data
      const masterPhases = [];
      const projectPhases = [];
      const dependencies = [];
      
      for (let i = 1; i <= numPhases; i++) {
        masterPhases.push({
          id: `concurrent-phase-${i}`,
          name: `Concurrent Phase ${i}`,
          description: `Concurrent phase ${i}`,
          order_index: i,
          created_at: new Date(),
          updated_at: new Date()
        });

        const phaseTimelineId = `concurrent-phase-timeline-${i}`;
        projectPhases.push({
          id: phaseTimelineId,
          project_id: testProjectId,
          phase_id: `concurrent-phase-${i}`,
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          created_at: new Date(),
          updated_at: new Date()
        });

        if (i > 1) {
          dependencies.push({
            id: `concurrent-dep-${i-1}-${i}`,
            project_id: testProjectId,
            predecessor_phase_timeline_id: `concurrent-phase-timeline-${i-1}`,
            successor_phase_timeline_id: phaseTimelineId,
            dependency_type: 'FS',
            lag_days: 0,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      await db('project_phases').insert(masterPhases);
      await db('project_phases_timeline').insert(projectPhases);
      await db('project_phase_dependencies').insert(dependencies);

      // Run multiple cascade calculations concurrently
      const cascadePromises = [];
      const numConcurrentOps = 5;
      
      const startTime = Date.now();
      
      for (let i = 0; i < numConcurrentOps; i++) {
        const cascadeData = {
          project_id: testProjectId,
          phase_timeline_id: 'concurrent-phase-timeline-1',
          new_start_date: `2024-0${2 + i}-01T00:00:00.000Z`,
          new_end_date: `2024-0${2 + i}-28T00:00:00.000Z`
        };

        cascadePromises.push(
          request(app)
            .post('/api/project-phase-dependencies/calculate-cascade')
            .send(cascadeData)
        );
      }

      const responses = await Promise.all(cascadePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('affectedPhases');
      });

      // Total time should be reasonable for concurrent operations
      expect(totalTime).toBeLessThan(10000); // 10 seconds
      
      console.log(`Concurrent cascade calculations (${numConcurrentOps} operations): ${totalTime}ms`);
    });
  });
});