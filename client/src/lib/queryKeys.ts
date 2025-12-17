/**
 * Query Key Factory
 *
 * Centralized query key definitions for React Query.
 * All query keys should be created using this factory to ensure consistency
 * and predictable cache invalidation.
 *
 * Key Hierarchy Pattern:
 * - Entity root: ['entityName']
 * - List queries: ['entityName', 'list', filters?]
 * - Detail queries: ['entityName', 'detail', id]
 * - Related data: ['entityName', 'subResource', id, additionalParams?]
 *
 * Scenario-Aware Pattern:
 * Many queries are scenario-specific. Include scenarioId in the key
 * to ensure data is cached per scenario.
 *
 * Usage:
 * ```typescript
 * // List all projects
 * useQuery({ queryKey: queryKeys.projects.list() })
 *
 * // List with filters and scenario
 * useQuery({ queryKey: queryKeys.projects.list({ status: 'active' }, scenarioId) })
 *
 * // Get single project
 * useQuery({ queryKey: queryKeys.projects.detail(projectId) })
 *
 * // Invalidate all project queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
 * ```
 */

// Type definitions for filter objects
export interface ProjectFilters {
  status?: string;
  projectTypeId?: string;
  locationId?: string;
  search?: string;
  [key: string]: unknown;
}

export interface PeopleFilters {
  roleId?: string;
  locationId?: string;
  search?: string;
  [key: string]: unknown;
}

export interface AssignmentFilters {
  projectId?: string;
  personId?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  projectTypeId?: string;
  locationId?: string;
  roleId?: string;
  [key: string]: unknown;
}

export interface RoadmapFilters {
  startDate?: string;
  endDate?: string;
  projectTypeId?: string;
  locationId?: string;
  [key: string]: unknown;
}

// Query key factory
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: ProjectFilters, scenarioId?: string) =>
      [...queryKeys.projects.lists(), filters, scenarioId] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    phases: (projectId: string) =>
      [...queryKeys.projects.all, 'phases', projectId] as const,
    phaseDependencies: (projectId: string) =>
      [...queryKeys.projects.all, 'phaseDependencies', projectId] as const,
    allocations: (projectId: string) =>
      [...queryKeys.projects.all, 'allocations', projectId] as const,
    assignments: (projectId: string) =>
      [...queryKeys.projects.all, 'assignments', projectId] as const,
    demand: (projectId: string) =>
      [...queryKeys.projects.all, 'demand', projectId] as const,
    timeline: (projectId: string) =>
      [...queryKeys.projects.all, 'timeline', projectId] as const,
    templateCompliance: (projectId: string) =>
      [...queryKeys.projects.all, 'templateCompliance', projectId] as const,
    roadmap: (filters?: RoadmapFilters) =>
      [...queryKeys.projects.all, 'roadmap', filters] as const,
  },

  // Project Types
  projectTypes: {
    all: ['projectTypes'] as const,
    lists: () => [...queryKeys.projectTypes.all, 'list'] as const,
    list: (filters?: Record<string, unknown>, viewMode?: string) =>
      [...queryKeys.projectTypes.lists(), filters, viewMode] as const,
    details: () => [...queryKeys.projectTypes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projectTypes.details(), id] as const,
    phases: (projectTypeId: string) =>
      [...queryKeys.projectTypes.all, 'phases', projectTypeId] as const,
    resourceTemplates: (projectTypeId: string) =>
      [...queryKeys.projectTypes.all, 'resourceTemplates', projectTypeId] as const,
    projects: (projectTypeId: string) =>
      [...queryKeys.projectTypes.all, 'projects', projectTypeId] as const,
  },

  // People
  people: {
    all: ['people'] as const,
    lists: () => [...queryKeys.people.all, 'list'] as const,
    list: (filters?: PeopleFilters) => [...queryKeys.people.lists(), filters] as const,
    details: () => [...queryKeys.people.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.people.details(), id] as const,
    withAssignments: (id: string) =>
      [...queryKeys.people.all, 'withAssignments', id] as const,
    timeline: (id: string) => [...queryKeys.people.all, 'timeline', id] as const,
    utilizationTimeline: (id: string, startDate?: string, endDate?: string) =>
      [...queryKeys.people.all, 'utilizationTimeline', id, startDate, endDate] as const,
    assignments: (personId: string) =>
      [...queryKeys.people.all, 'assignments', personId] as const,
    utilization: () => [...queryKeys.people.all, 'utilization'] as const,
  },

  // Roles
  roles: {
    all: ['roles'] as const,
    lists: () => [...queryKeys.roles.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.roles.lists(), filters] as const,
    details: () => [...queryKeys.roles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.roles.details(), id] as const,
  },

  // Locations
  locations: {
    all: ['locations'] as const,
    lists: () => [...queryKeys.locations.all, 'list'] as const,
    list: () => [...queryKeys.locations.lists()] as const,
    details: () => [...queryKeys.locations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.locations.details(), id] as const,
  },

  // Assignments
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (filters?: AssignmentFilters, scenarioId?: string) =>
      [...queryKeys.assignments.lists(), filters, scenarioId] as const,
    details: () => [...queryKeys.assignments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.assignments.details(), id] as const,
    recommendations: (filters?: AssignmentFilters) =>
      [...queryKeys.assignments.all, 'recommendations', filters] as const,
  },

  // Scenarios
  scenarios: {
    all: ['scenarios'] as const,
    lists: () => [...queryKeys.scenarios.all, 'list'] as const,
    list: () => [...queryKeys.scenarios.lists()] as const,
    details: () => [...queryKeys.scenarios.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.scenarios.details(), id] as const,
  },

  // Availability
  availability: {
    all: ['availability'] as const,
    overrides: (personId?: string, month?: string) =>
      [...queryKeys.availability.all, 'overrides', personId, month] as const,
  },

  // Phases (templates)
  phases: {
    all: ['phases'] as const,
    lists: () => [...queryKeys.phases.all, 'list'] as const,
    list: () => [...queryKeys.phases.lists()] as const,
    templates: () => [...queryKeys.phases.all, 'templates'] as const,
  },

  // Demands
  demands: {
    all: ['demands'] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    capacity: (filters?: ReportFilters, scenarioId?: string) =>
      [...queryKeys.reports.all, 'capacity', filters, scenarioId] as const,
    utilization: (filters?: ReportFilters, scenarioId?: string) =>
      [...queryKeys.reports.all, 'utilization', filters, scenarioId] as const,
    demand: (filters?: ReportFilters, scenarioId?: string) =>
      [...queryKeys.reports.all, 'demand', filters, scenarioId] as const,
    gaps: (filters?: ReportFilters, scenarioId?: string) =>
      [...queryKeys.reports.all, 'gaps', filters, scenarioId] as const,
    filterOptions: () => [...queryKeys.reports.all, 'filterOptions'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    summary: (scenarioId?: string, dateRange?: Record<string, string>) =>
      [...queryKeys.dashboard.all, 'summary', scenarioId, dateRange] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    system: () => [...queryKeys.settings.all, 'system'] as const,
    import: () => [...queryKeys.settings.all, 'import'] as const,
    usersPermissions: () => [...queryKeys.settings.all, 'usersPermissions'] as const,
    userRoles: () => [...queryKeys.settings.all, 'userRoles'] as const,
    systemPermissions: () => [...queryKeys.settings.all, 'systemPermissions'] as const,
  },

  // Resource Templates
  resourceTemplates: {
    all: ['resourceTemplates'] as const,
    byRole: (roleId: string) =>
      [...queryKeys.resourceTemplates.all, 'byRole', roleId] as const,
    byProjectType: (projectTypeId: string) =>
      [...queryKeys.resourceTemplates.all, 'byProjectType', projectTypeId] as const,
  },

  // All project allocations (global view)
  projectAllocations: {
    all: ['projectAllocations'] as const,
    list: () => [...queryKeys.projectAllocations.all, 'list'] as const,
  },

  // Available projects for assignment
  availableProjects: {
    all: ['availableProjects'] as const,
    forPerson: (personId: string, scenarioId?: string) =>
      [...queryKeys.availableProjects.all, personId, scenarioId] as const,
  },

  // Health check
  health: {
    all: ['health'] as const,
    check: () => [...queryKeys.health.all, 'check'] as const,
  },
} as const;

// Type helper for extracting query key type
export type QueryKey = ReturnType<
  | typeof queryKeys.projects.list
  | typeof queryKeys.projects.detail
  | typeof queryKeys.people.list
  | typeof queryKeys.people.detail
  | typeof queryKeys.assignments.list
  | typeof queryKeys.scenarios.list
  | typeof queryKeys.reports.capacity
  | typeof queryKeys.dashboard.summary
>;

/**
 * Helper function to invalidate all queries for an entity
 * @param queryClient - The query client instance
 * @param entityKey - The base entity key (e.g., queryKeys.projects.all)
 */
export function invalidateEntity(
  queryClient: { invalidateQueries: (options: { queryKey: readonly string[] }) => void },
  entityKey: readonly string[]
): void {
  queryClient.invalidateQueries({ queryKey: entityKey });
}

/**
 * Helper function to invalidate multiple related entities after a mutation
 * @param queryClient - The query client instance
 * @param entityKeys - Array of entity keys to invalidate
 */
export function invalidateMultiple(
  queryClient: { invalidateQueries: (options: { queryKey: readonly string[] }) => void },
  entityKeys: readonly (readonly string[])[]
): void {
  entityKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

export default queryKeys;
