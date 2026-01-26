/**
 * Valid scenario fixtures for Git sync testing
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 */

/**
 * Minimal valid scenario - just required fields
 */
export const minimalScenario = {
  schemaVersion: '1.0.0',
  exportedAt: '2024-01-15T10:30:00.000Z',
  scenarioId: 'scenario-001',
  data: {
    projects: [],
    people: [],
    assignments: [],
  },
};

/**
 * Scenario with a single project
 */
export const singleProjectScenario = {
  schemaVersion: '1.0.0',
  exportedAt: '2024-01-15T10:30:00.000Z',
  exportedBy: 'test@example.com',
  scenarioId: 'scenario-002',
  data: {
    projects: [
      {
        id: 'proj-001',
        name: 'Test Project Alpha',
        description: 'A test project for unit testing',
        priority: 2,
        aspiration_start: '2024-02-01',
        aspiration_finish: '2024-06-30',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
    ],
    people: [],
    assignments: [],
  },
};

/**
 * Scenario with people
 */
export const scenarioWithPeople = {
  schemaVersion: '1.0.0',
  exportedAt: '2024-01-15T10:30:00.000Z',
  exportedBy: 'test@example.com',
  scenarioId: 'scenario-003',
  data: {
    projects: [],
    people: [
      {
        id: 'person-001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role_id: 'role-001',
        location_id: 'loc-001',
        hire_date: '2023-01-15',
        availability_percentage: 100,
        created_at: '2023-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
      {
        id: 'person-002',
        name: 'Bob Smith',
        email: 'bob@example.com',
        role_id: 'role-002',
        location_id: 'loc-001',
        hire_date: '2023-03-01',
        availability_percentage: 80,
        created_at: '2023-03-01T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
    ],
    assignments: [],
  },
};

/**
 * Full scenario with projects, people, and assignments
 */
export const fullScenario = {
  schemaVersion: '1.0.0',
  exportedAt: '2024-01-15T10:30:00.000Z',
  exportedBy: 'test@example.com',
  scenarioId: 'scenario-full',
  data: {
    projects: [
      {
        id: 'proj-001',
        name: 'Website Redesign',
        description: 'Complete overhaul of company website',
        priority: 3,
        aspiration_start: '2024-02-01',
        aspiration_finish: '2024-06-30',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
      {
        id: 'proj-002',
        name: 'Mobile App MVP',
        description: 'Initial mobile application release',
        priority: 2,
        aspiration_start: '2024-03-01',
        aspiration_finish: '2024-09-30',
        created_at: '2024-01-05T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
    ],
    people: [
      {
        id: 'person-001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role_id: 'role-001',
        location_id: 'loc-001',
        hire_date: '2023-01-15',
        availability_percentage: 100,
        created_at: '2023-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
      {
        id: 'person-002',
        name: 'Bob Smith',
        email: 'bob@example.com',
        role_id: 'role-002',
        location_id: 'loc-001',
        hire_date: '2023-03-01',
        availability_percentage: 80,
        created_at: '2023-03-01T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
    ],
    assignments: [
      {
        id: 'assign-001',
        person_id: 'person-001',
        project_id: 'proj-001',
        role_id: 'role-001',
        allocation_percentage: 50,
        start_date: '2024-02-01',
        end_date: '2024-06-30',
        created_at: '2024-01-10T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
      {
        id: 'assign-002',
        person_id: 'person-002',
        project_id: 'proj-001',
        role_id: 'role-002',
        allocation_percentage: 75,
        start_date: '2024-02-01',
        end_date: '2024-04-30',
        created_at: '2024-01-10T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
      {
        id: 'assign-003',
        person_id: 'person-001',
        project_id: 'proj-002',
        role_id: 'role-001',
        allocation_percentage: 50,
        start_date: '2024-03-01',
        end_date: '2024-09-30',
        created_at: '2024-01-10T00:00:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
    ],
    roles: [
      {
        id: 'role-001',
        name: 'Developer',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'role-002',
        name: 'Designer',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
    ],
    locations: [
      {
        id: 'loc-001',
        name: 'Headquarters',
        timezone: 'America/New_York',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
    ],
  },
};

/**
 * Scenario with assignments for allocation testing
 */
export const scenarioWithAssignments = {
  schemaVersion: '1.0.0',
  exportedAt: '2024-01-15T10:30:00.000Z',
  exportedBy: 'test@example.com',
  scenarioId: 'scenario-assignments',
  data: {
    projects: [
      {
        id: 'proj-001',
        name: 'Project A',
        priority: 3,
        aspiration_start: '2024-01-01',
        aspiration_finish: '2024-12-31',
      },
      {
        id: 'proj-002',
        name: 'Project B',
        priority: 2,
        aspiration_start: '2024-03-01',
        aspiration_finish: '2024-12-31',
      },
    ],
    people: [
      {
        id: 'person-001',
        name: 'Test Person',
        email: 'test@example.com',
        availability_percentage: 100,
      },
    ],
    assignments: [
      {
        id: 'assign-001',
        person_id: 'person-001',
        project_id: 'proj-001',
        allocation_percentage: 60,
        start_date: '2024-01-01',
        end_date: '2024-06-30',
      },
      {
        id: 'assign-002',
        person_id: 'person-001',
        project_id: 'proj-002',
        allocation_percentage: 40,
        start_date: '2024-03-01',
        end_date: '2024-12-31',
      },
    ],
  },
};

/**
 * Large scenario for performance testing
 */
export function generateLargeScenario(
  projectCount: number = 100,
  peopleCount: number = 50,
  assignmentsPerPerson: number = 3
) {
  const projects = Array.from({ length: projectCount }, (_, i) => ({
    id: `proj-${String(i + 1).padStart(3, '0')}`,
    name: `Project ${i + 1}`,
    description: `Description for project ${i + 1}`,
    priority: (i % 3) + 1,
    aspiration_start: '2024-01-01',
    aspiration_finish: '2024-12-31',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const people = Array.from({ length: peopleCount }, (_, i) => ({
    id: `person-${String(i + 1).padStart(3, '0')}`,
    name: `Person ${i + 1}`,
    email: `person${i + 1}@example.com`,
    role_id: 'role-001',
    availability_percentage: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const assignments: any[] = [];
  for (let personIdx = 0; personIdx < peopleCount; personIdx++) {
    for (let assignIdx = 0; assignIdx < assignmentsPerPerson; assignIdx++) {
      const projectIdx = (personIdx * assignmentsPerPerson + assignIdx) % projectCount;
      assignments.push({
        id: `assign-${String(assignments.length + 1).padStart(4, '0')}`,
        person_id: people[personIdx].id,
        project_id: projects[projectIdx].id,
        allocation_percentage: Math.floor(100 / assignmentsPerPerson),
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy: 'performance-test@example.com',
    scenarioId: 'scenario-large',
    data: {
      projects,
      people,
      assignments,
    },
  };
}
