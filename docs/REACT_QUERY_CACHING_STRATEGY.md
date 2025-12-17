# React Query Caching Strategy

This document describes the caching strategy and query key patterns used in Capacinator's React Query implementation.

## Query Key Factory

All query keys are managed through a centralized factory located at `client/src/lib/queryKeys.ts`. This ensures:

- **Consistency**: All query keys follow the same naming convention
- **Type Safety**: TypeScript support for query key construction
- **Maintainability**: Single source of truth for query key structure
- **Reliable Invalidation**: Hierarchical keys enable precise cache invalidation

## Query Key Structure

Query keys follow a hierarchical pattern that enables granular cache control:

```typescript
// Entity base key (for broad invalidation)
queryKeys.projects.all        // ['projects']

// List queries
queryKeys.projects.lists()    // ['projects', 'list']
queryKeys.projects.list(filters, scenarioId)  // ['projects', 'list', filters, scenarioId]

// Detail queries
queryKeys.projects.details()  // ['projects', 'detail']
queryKeys.projects.detail(id) // ['projects', 'detail', id]

// Related data
queryKeys.projects.phases(id)        // ['projects', 'phases', id]
queryKeys.projects.timeline(id)      // ['projects', 'timeline', id]
queryKeys.projects.allocations(id)   // ['projects', 'allocations', id]
```

## Cache Invalidation Patterns

### After Create Operations

When creating a new entity, invalidate the entity's list queries:

```typescript
const createProjectMutation = useMutation({
  mutationFn: (data) => api.projects.create(data),
  onSuccess: () => {
    // Invalidate all project lists to show the new entity
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }
});
```

### After Update Operations

When updating an entity, invalidate both the specific detail and related lists:

```typescript
const updateProjectMutation = useMutation({
  mutationFn: ({ id, data }) => api.projects.update(id, data),
  onSuccess: (_, { id }) => {
    // Invalidate the specific project and all lists
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }
});
```

### After Delete Operations

When deleting an entity, invalidate the lists:

```typescript
const deleteProjectMutation = useMutation({
  mutationFn: (id) => api.projects.delete(id),
  onSuccess: () => {
    // Lists will update to reflect deletion
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }
});
```

### Cross-Entity Invalidation

Some operations affect multiple entity types:

```typescript
const createAssignmentMutation = useMutation({
  mutationFn: (data) => api.assignments.create(data),
  onSuccess: (_, { person_id, project_id }) => {
    // Invalidate assignments
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });

    // Invalidate affected person's data
    queryClient.invalidateQueries({ queryKey: queryKeys.people.detail(person_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.people.timeline(person_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.people.utilizationTimeline(person_id) });

    // Invalidate affected project's data
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.assignments(project_id) });
  }
});
```

## Scenario-Aware Caching

Many queries in Capacinator are scenario-dependent. The `scenarioId` is included in query keys to ensure proper cache separation:

```typescript
// Scenario-specific project list
queryKeys.projects.list(filters, scenarioId)

// Scenario-specific reports
queryKeys.reports.capacity(filters, scenarioId)
queryKeys.reports.utilization(filters, scenarioId)
```

When switching scenarios, the cache automatically contains separate entries for each scenario, preventing stale data display.

## Stale Time Configuration

Default stale times are configured in the QueryClient:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes (garbage collection)
      refetchOnWindowFocus: true,
      retry: 3,
    },
  },
});
```

Some queries may override these defaults:

- **Frequently changing data** (e.g., real-time status): Lower staleTime
- **Static reference data** (e.g., locations, phases): Higher staleTime

## Entity Query Keys Reference

### Projects
| Key | Description |
|-----|-------------|
| `queryKeys.projects.all` | Base key for all project queries |
| `queryKeys.projects.list(filters?, scenarioId?)` | Filtered project list |
| `queryKeys.projects.detail(id)` | Single project details |
| `queryKeys.projects.phases(id)` | Project phases |
| `queryKeys.projects.timeline(id)` | Project timeline |
| `queryKeys.projects.allocations(id)` | Project allocations |
| `queryKeys.projects.assignments(id)` | Project assignments |
| `queryKeys.projects.demand(id)` | Project demand |
| `queryKeys.projects.templateCompliance(id)` | Template compliance |
| `queryKeys.projects.roadmap(filters?)` | Project roadmap |
| `queryKeys.projects.health()` | Project health dashboard |

### People
| Key | Description |
|-----|-------------|
| `queryKeys.people.all` | Base key for all people queries |
| `queryKeys.people.list(filters?, scenarioId?)` | Filtered people list |
| `queryKeys.people.detail(id)` | Single person details |
| `queryKeys.people.withAssignments(id)` | Person with assignments |
| `queryKeys.people.timeline(id)` | Person timeline |
| `queryKeys.people.utilizationTimeline(id, start?, end?)` | Utilization over time |
| `queryKeys.people.assignments(id, scenarioId?)` | Person's assignments |
| `queryKeys.people.utilization()` | Overall utilization |
| `queryKeys.people.availability()` | Overall availability |

### Assignments
| Key | Description |
|-----|-------------|
| `queryKeys.assignments.all` | Base key for all assignment queries |
| `queryKeys.assignments.list(filters?, scenarioId?)` | Filtered assignments |
| `queryKeys.assignments.detail(id)` | Single assignment |
| `queryKeys.assignments.conflicts(personId)` | Assignment conflicts |
| `queryKeys.assignments.suggestions(params?)` | AI suggestions |
| `queryKeys.assignments.timeline(personId)` | Assignment timeline |

### Roles
| Key | Description |
|-----|-------------|
| `queryKeys.roles.all` | Base key for all role queries |
| `queryKeys.roles.list(filters?)` | Filtered role list |
| `queryKeys.roles.detail(id)` | Single role details |
| `queryKeys.roles.capacityGaps()` | Capacity gap analysis |

### Scenarios
| Key | Description |
|-----|-------------|
| `queryKeys.scenarios.all` | Base key for all scenario queries |
| `queryKeys.scenarios.list()` | All scenarios |
| `queryKeys.scenarios.detail(id)` | Single scenario |
| `queryKeys.scenarios.assignments(id)` | Scenario assignments |
| `queryKeys.scenarios.comparison(id, compareId)` | Scenario comparison |

### Reports
| Key | Description |
|-----|-------------|
| `queryKeys.reports.all` | Base key for all report queries |
| `queryKeys.reports.dashboard(scenarioId?)` | Dashboard data |
| `queryKeys.reports.capacity(filters?, scenarioId?)` | Capacity report |
| `queryKeys.reports.utilization(filters?, scenarioId?)` | Utilization report |
| `queryKeys.reports.demand(filters?, scenarioId?)` | Demand report |
| `queryKeys.reports.gaps(filters?, scenarioId?)` | Gaps analysis |
| `queryKeys.reports.filterOptions()` | Report filter options |
| `queryKeys.reports.availableProjects(personId?, scenarioId?)` | Available projects |

### Other Entities
| Key | Description |
|-----|-------------|
| `queryKeys.locations.list()` | All locations |
| `queryKeys.phases.list()` | All phases |
| `queryKeys.phases.templates()` | Phase templates |
| `queryKeys.projectPhases.byProject(id)` | Phases for a project |
| `queryKeys.projectTypes.list(filters?, viewMode?)` | Project types |
| `queryKeys.availability.overrides(personId?, month?)` | Availability overrides |
| `queryKeys.settings.system()` | System settings |
| `queryKeys.settings.import()` | Import settings |
| `queryKeys.health.check()` | Health check |

## Best Practices

1. **Always use the factory**: Never use inline array query keys
   ```typescript
   // Good
   queryKey: queryKeys.projects.list(filters)

   // Bad
   queryKey: ['projects', 'list', filters]
   ```

2. **Invalidate at the right level**: Use the most specific key possible
   ```typescript
   // Invalidate just one project
   queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });

   // Invalidate all project data
   queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
   ```

3. **Consider cascade effects**: When updating data, think about related queries
   - Updating a person may affect their utilization timeline
   - Updating assignments affects both person and project views

4. **Use enabled flag for conditional queries**:
   ```typescript
   useQuery({
     queryKey: queryKeys.projects.list(filters, scenarioId),
     queryFn: fetchProjects,
     enabled: !!scenarioId  // Only fetch when scenario is selected
   });
   ```

5. **Handle scenario context**: Include scenarioId in keys for scenario-dependent data to ensure proper cache isolation.
