/**
 * Conflict scenario fixtures for Git sync testing
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Provides three-way merge conflict scenarios:
 * - base: Common ancestor version
 * - local: User's local changes
 * - remote: Remote repository changes
 */

export interface ConflictScenario<T = any> {
  name: string;
  description: string;
  entityType: 'project' | 'person' | 'assignment' | 'project_phase';
  entityId: string;
  base: T;
  local: T;
  remote: T;
  expectedResolutionOptions: string[];
}

/**
 * Simple single-field conflict (project name changed by both parties)
 */
export const simpleFieldConflict: ConflictScenario = {
  name: 'Simple Field Conflict',
  description: 'Both local and remote changed the same field to different values',
  entityType: 'project',
  entityId: 'proj-001',
  base: {
    id: 'proj-001',
    name: 'Original Project Name',
    description: 'Original description',
    priority: 2,
    aspiration_start: '2024-01-01',
    aspiration_finish: '2024-06-30',
    updated_at: '2024-01-10T00:00:00.000Z',
  },
  local: {
    id: 'proj-001',
    name: 'Local Updated Name',
    description: 'Original description',
    priority: 2,
    aspiration_start: '2024-01-01',
    aspiration_finish: '2024-06-30',
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: {
    id: 'proj-001',
    name: 'Remote Updated Name',
    description: 'Original description',
    priority: 2,
    aspiration_start: '2024-01-01',
    aspiration_finish: '2024-06-30',
    updated_at: '2024-01-15T12:00:00.000Z',
  },
  expectedResolutionOptions: ['accept_local', 'accept_remote', 'custom'],
};

/**
 * Multiple fields changed differently by local and remote
 */
export const multiFieldConflict: ConflictScenario = {
  name: 'Multi-Field Conflict',
  description: 'Multiple fields changed differently by local and remote',
  entityType: 'project',
  entityId: 'proj-002',
  base: {
    id: 'proj-002',
    name: 'Project Beta',
    description: 'Beta project description',
    priority: 2,
    aspiration_start: '2024-02-01',
    aspiration_finish: '2024-08-31',
    updated_at: '2024-01-10T00:00:00.000Z',
  },
  local: {
    id: 'proj-002',
    name: 'Project Beta Updated',
    description: 'Local updated description',
    priority: 3, // Local increased priority
    aspiration_start: '2024-02-01',
    aspiration_finish: '2024-09-30', // Local extended finish date
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: {
    id: 'proj-002',
    name: 'Project Beta - Renamed',
    description: 'Remote updated description',
    priority: 1, // Remote decreased priority
    aspiration_start: '2024-03-01', // Remote delayed start
    aspiration_finish: '2024-08-31',
    updated_at: '2024-01-15T12:00:00.000Z',
  },
  expectedResolutionOptions: ['accept_local', 'accept_remote', 'custom'],
};

/**
 * Deletion conflict - local modified, remote deleted
 */
export const deletionConflict: ConflictScenario = {
  name: 'Deletion Conflict',
  description: 'Local modified entity that remote deleted',
  entityType: 'assignment',
  entityId: 'assign-001',
  base: {
    id: 'assign-001',
    person_id: 'person-001',
    project_id: 'proj-001',
    allocation_percentage: 50,
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    updated_at: '2024-01-10T00:00:00.000Z',
  },
  local: {
    id: 'assign-001',
    person_id: 'person-001',
    project_id: 'proj-001',
    allocation_percentage: 75, // Local increased allocation
    start_date: '2024-01-01',
    end_date: '2024-09-30', // Local extended assignment
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: null, // Remote deleted the assignment
  expectedResolutionOptions: ['keep_local', 'accept_deletion'],
};

/**
 * Creation conflict - both created entity with same ID
 */
export const creationConflict: ConflictScenario = {
  name: 'Creation Conflict',
  description: 'Both local and remote created entity with same ID',
  entityType: 'person',
  entityId: 'person-new-001',
  base: null, // Entity didn't exist in base
  local: {
    id: 'person-new-001',
    name: 'New Person Local',
    email: 'newperson.local@example.com',
    role_id: 'role-001',
    availability_percentage: 100,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: {
    id: 'person-new-001',
    name: 'New Person Remote',
    email: 'newperson.remote@example.com',
    role_id: 'role-002',
    availability_percentage: 80,
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z',
  },
  expectedResolutionOptions: ['accept_local', 'accept_remote', 'keep_both'],
};

/**
 * Nested object conflict (project phases)
 */
export const nestedConflict: ConflictScenario = {
  name: 'Nested Object Conflict',
  description: 'Conflict in nested object structure (project phases)',
  entityType: 'project_phase',
  entityId: 'phase-001',
  base: {
    id: 'phase-001',
    project_id: 'proj-001',
    name: 'Phase 1: Planning',
    start_date: '2024-01-01',
    end_date: '2024-02-28',
    status: 'in_progress',
    milestones: [
      { id: 'ms-001', name: 'Kickoff', date: '2024-01-01', completed: true },
      { id: 'ms-002', name: 'Requirements', date: '2024-01-31', completed: false },
    ],
    updated_at: '2024-01-10T00:00:00.000Z',
  },
  local: {
    id: 'phase-001',
    project_id: 'proj-001',
    name: 'Phase 1: Planning',
    start_date: '2024-01-01',
    end_date: '2024-03-15', // Local extended phase
    status: 'in_progress',
    milestones: [
      { id: 'ms-001', name: 'Kickoff', date: '2024-01-01', completed: true },
      { id: 'ms-002', name: 'Requirements', date: '2024-02-15', completed: true }, // Local completed
      { id: 'ms-003', name: 'Design Review', date: '2024-03-01', completed: false }, // Local added
    ],
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: {
    id: 'phase-001',
    project_id: 'proj-001',
    name: 'Phase 1: Planning & Discovery', // Remote renamed
    start_date: '2024-01-01',
    end_date: '2024-02-28',
    status: 'completed', // Remote marked completed
    milestones: [
      { id: 'ms-001', name: 'Kickoff', date: '2024-01-01', completed: true },
      { id: 'ms-002', name: 'Requirements Finalized', date: '2024-01-31', completed: true }, // Remote renamed & completed
    ],
    updated_at: '2024-01-15T12:00:00.000Z',
  },
  expectedResolutionOptions: ['accept_local', 'accept_remote', 'merge_manual'],
};

/**
 * Allocation over-commitment conflict
 * (person assigned >100% when combining local and remote changes)
 */
export const allocationConflict: ConflictScenario = {
  name: 'Allocation Conflict',
  description: 'Combined allocations exceed 100%',
  entityType: 'assignment',
  entityId: 'assign-002',
  base: {
    id: 'assign-002',
    person_id: 'person-001',
    project_id: 'proj-002',
    allocation_percentage: 30,
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    updated_at: '2024-01-10T00:00:00.000Z',
  },
  local: {
    id: 'assign-002',
    person_id: 'person-001',
    project_id: 'proj-002',
    allocation_percentage: 60, // Local increased to 60%
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: {
    id: 'assign-002',
    person_id: 'person-001',
    project_id: 'proj-002',
    allocation_percentage: 80, // Remote increased to 80%
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    updated_at: '2024-01-15T12:00:00.000Z',
  },
  expectedResolutionOptions: ['accept_local', 'accept_remote', 'custom'],
};

/**
 * Date overlap conflict
 */
export const dateOverlapConflict: ConflictScenario = {
  name: 'Date Overlap Conflict',
  description: 'Local and remote changed dates creating potential overlap',
  entityType: 'project',
  entityId: 'proj-003',
  base: {
    id: 'proj-003',
    name: 'Project Gamma',
    aspiration_start: '2024-04-01',
    aspiration_finish: '2024-06-30',
    updated_at: '2024-01-10T00:00:00.000Z',
  },
  local: {
    id: 'proj-003',
    name: 'Project Gamma',
    aspiration_start: '2024-03-01', // Local moved earlier
    aspiration_finish: '2024-05-31',
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  remote: {
    id: 'proj-003',
    name: 'Project Gamma',
    aspiration_start: '2024-05-01', // Remote moved later
    aspiration_finish: '2024-08-31',
    updated_at: '2024-01-15T12:00:00.000Z',
  },
  expectedResolutionOptions: ['accept_local', 'accept_remote', 'custom'],
};

/**
 * Get all conflict scenarios for testing
 */
export function getAllConflictScenarios(): ConflictScenario[] {
  return [
    simpleFieldConflict,
    multiFieldConflict,
    deletionConflict,
    creationConflict,
    nestedConflict,
    allocationConflict,
    dateOverlapConflict,
  ];
}

/**
 * Get conflict scenarios by entity type
 */
export function getConflictsByEntityType(
  entityType: 'project' | 'person' | 'assignment' | 'project_phase'
): ConflictScenario[] {
  return getAllConflictScenarios().filter((c) => c.entityType === entityType);
}
