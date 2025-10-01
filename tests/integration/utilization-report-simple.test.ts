import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from './setup';
import { v4 as uuidv4 } from 'uuid';

describe('Utilization Report Simple Tests', () => {
  let testPersonId: string;
  let testProjectId: string;
  let testRoleId: string;
  let testLocationId: string;
  let testProjectTypeId: string;
  
  beforeEach(async () => {
    // Create test data
    testLocationId = uuidv4();
    await db('locations').insert({
      id: testLocationId,
      name: 'Test Location',
      timezone: 'UTC',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    testProjectTypeId = uuidv4();
    await db('project_types').insert({
      id: testProjectTypeId,
      name: 'Test Type',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    testRoleId = uuidv4();
    await db('roles').insert({
      id: testRoleId,
      name: 'Developer',
      level: 3,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    testPersonId = uuidv4();
    await db('people').insert({
      id: testPersonId,
      name: 'Test Person',
      email: 'test@example.com',
      is_active: true,
      worker_type: 'employee',
      default_hours_per_day: 8,
      default_availability_percentage: 100,
      location_id: testLocationId,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    testProjectId = uuidv4();
    await db('projects').insert({
      id: testProjectId,
      name: 'Test Project',
      project_type_id: testProjectTypeId,
      priority: 1,
      aspiration_start: '2025-01-01',
      aspiration_finish: '2025-12-31',
      include_in_demand: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });
  
  afterEach(async () => {
    // Clean up in reverse order due to foreign keys
    await db('project_assignments').delete();
    await db('people').where('id', testPersonId).delete();
    await db('projects').where('id', testProjectId).delete();
    await db('roles').where('id', testRoleId).delete();
    await db('project_types').where('id', testProjectTypeId).delete();
    await db('locations').where('id', testLocationId).delete();
  });
  
  test('should calculate utilization correctly with single assignment', async () => {
    // Create assignment
    await db('project_assignments').insert({
      id: uuidv4(),
      project_id: testProjectId,
      person_id: testPersonId,
      role_id: testRoleId,
      allocation_percentage: 50,
      assignment_date_mode: 'fixed',
      start_date: '2025-09-01',
      end_date: '2025-12-31',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Query utilization data directly from database
    const query = `
      WITH date_filtered_assignments AS (
        SELECT 
          pa.person_id,
          pa.project_id,
          p.name as project_name,
          pa.allocation_percentage,
          COALESCE(pa.start_date, p.aspiration_start) as computed_start_date,
          COALESCE(pa.end_date, p.aspiration_finish) as computed_end_date
        FROM project_assignments pa
        JOIN projects p ON pa.project_id = p.id
        WHERE 
          COALESCE(pa.start_date, p.aspiration_start) <= '2025-12-31'
          AND COALESCE(pa.end_date, p.aspiration_finish) >= '2025-09-01'
      )
      SELECT 
        p.id as person_id,
        p.name as person_name,
        COALESCE(SUM(a.allocation_percentage), 0) as total_allocation_percentage,
        COUNT(DISTINCT a.project_id) as project_count
      FROM people p
      LEFT JOIN date_filtered_assignments a ON p.id = a.person_id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const result = await db.raw(query, [testPersonId]);
    const personUtilization = result[0];
    
    expect(personUtilization.total_allocation_percentage).toBe(50);
    expect(personUtilization.project_count).toBe(1);
  });
  
  test('should aggregate multiple assignments correctly', async () => {
    // Create second project
    const secondProjectId = uuidv4();
    await db('projects').insert({
      id: secondProjectId,
      name: 'Second Project',
      project_type_id: testProjectTypeId,
      priority: 1,
      aspiration_start: '2025-01-01',
      aspiration_finish: '2025-12-31',
      include_in_demand: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Create two assignments
    await db('project_assignments').insert([
      {
        id: uuidv4(),
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        allocation_percentage: 40,
        assignment_date_mode: 'fixed',
        start_date: '2025-09-01',
        end_date: '2025-12-31',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: secondProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        allocation_percentage: 60,
        assignment_date_mode: 'fixed',
        start_date: '2025-10-01',
        end_date: '2025-11-30',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    
    // Query utilization
    const query = `
      WITH date_filtered_assignments AS (
        SELECT 
          pa.person_id,
          pa.project_id,
          pa.allocation_percentage
        FROM project_assignments pa
        JOIN projects p ON pa.project_id = p.id
        WHERE 
          COALESCE(pa.start_date, p.aspiration_start) <= '2025-12-31'
          AND COALESCE(pa.end_date, p.aspiration_finish) >= '2025-09-01'
      )
      SELECT 
        p.id as person_id,
        COALESCE(SUM(a.allocation_percentage), 0) as total_allocation_percentage,
        COUNT(DISTINCT a.project_id) as project_count
      FROM people p
      LEFT JOIN date_filtered_assignments a ON p.id = a.person_id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const result = await db.raw(query, [testPersonId]);
    const personUtilization = result[0];
    
    expect(personUtilization.total_allocation_percentage).toBe(100);
    expect(personUtilization.project_count).toBe(2);
    
    // Clean up second project
    await db('projects').where('id', secondProjectId).delete();
  });
  
  test('should handle assignments with null dates', async () => {
    // Create assignment with null dates (should use project dates)
    await db('project_assignments').insert({
      id: uuidv4(),
      project_id: testProjectId,
      person_id: testPersonId,
      role_id: testRoleId,
      allocation_percentage: 75,
      assignment_date_mode: 'project',
      start_date: null,
      end_date: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Query utilization
    const query = `
      SELECT 
        pa.person_id,
        pa.allocation_percentage,
        COALESCE(pa.start_date, p.aspiration_start) as computed_start_date,
        COALESCE(pa.end_date, p.aspiration_finish) as computed_end_date
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.person_id = ?
    `;
    
    const result = await db.raw(query, [testPersonId]);
    const assignment = result[0];
    
    expect(assignment.computed_start_date).toBe('2025-01-01');
    expect(assignment.computed_end_date).toBe('2025-12-31');
    expect(assignment.allocation_percentage).toBe(75);
  });
  
  test('should validate allocation percentage limits', async () => {
    // Test that allocations are stored correctly even when high
    await db('project_assignments').insert({
      id: uuidv4(),
      project_id: testProjectId,
      person_id: testPersonId,
      role_id: testRoleId,
      allocation_percentage: 150, // High allocation
      assignment_date_mode: 'fixed',
      start_date: '2025-09-01',
      end_date: '2025-12-31',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const assignment = await db('project_assignments')
      .where('person_id', testPersonId)
      .first();
    
    expect(assignment.allocation_percentage).toBe(150);
  });
});