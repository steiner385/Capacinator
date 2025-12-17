# React Query Caching Strategy

This document outlines the standardized approach for React Query usage in Capacinator.

## Query Key Factory

All query keys are defined in `queryKeys.ts` to ensure consistency and predictable cache invalidation.

### Key Structure

Query keys follow a hierarchical structure:

```typescript
// Entity root - for invalidating all entity queries
queryKeys.projects.all  // ['projects']

// List queries - for fetching collections
queryKeys.projects.list(filters, scenarioId)  // ['projects', 'list', filters, scenarioId]

// Detail queries - for fetching single items
queryKeys.projects.detail(id)  // ['projects', 'detail', id]

// Related data - for entity-specific sub-resources
queryKeys.projects.phases(projectId)  // ['projects', 'phases', projectId]
```

### Available Entities

| Entity | Root Key | Common Methods |
|--------|----------|----------------|
| `projects` | `['projects']` | list, detail, phases, allocations, demand, timeline |
| `projectTypes` | `['projectTypes']` | list, detail, phases, resourceTemplates |
| `people` | `['people']` | list, detail, timeline, utilizationTimeline, assignments |
| `roles` | `['roles']` | list, detail |
| `locations` | `['locations']` | list, detail |
| `assignments` | `['assignments']` | list, detail, recommendations |
| `scenarios` | `['scenarios']` | list, detail |
| `reports` | `['reports']` | capacity, utilization, demand, gaps |
| `dashboard` | `['dashboard']` | summary |
| `settings` | `['settings']` | system, import, usersPermissions |

## Usage Patterns

### Fetching Data

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

// List with filters
const { data } = useQuery({
  queryKey: queryKeys.projects.list(filters, currentScenario?.id),
  queryFn: () => api.projects.list(filters),
});

// Single item
const { data } = useQuery({
  queryKey: queryKeys.projects.detail(projectId),
  queryFn: () => api.projects.get(projectId),
});
```

### Invalidating Cache After Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (data) => api.projects.create(data),
  onSuccess: () => {
    // Invalidate all project queries (lists, details, related data)
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  },
});
```

### Invalidating Related Entities

When a mutation affects multiple entities, invalidate all affected caches:

```typescript
const deleteAssignment = useMutation({
  mutationFn: (id) => api.assignments.delete(id),
  onSuccess: () => {
    // Invalidate assignments
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    // Also invalidate related person data
    queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
    // And project data
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  },
});
```

## Scenario-Aware Queries

Many queries in Capacinator are scenario-specific. Include `scenarioId` in the query key to ensure proper cache separation:

```typescript
// Data is cached per scenario
queryKeys.projects.list(filters, currentScenario?.id)
queryKeys.assignments.list(filters, currentScenario?.id)
queryKeys.reports.capacity(filters, currentScenario?.id)
```

This ensures:
- Switching scenarios fetches fresh data
- Each scenario maintains its own cache
- Invalidation is scenario-specific when needed

## Default Options

The app-level QueryClient configuration in `App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
```

- **staleTime**: Data is considered fresh for 5 minutes
- **retry**: Failed queries are retried once

## Migration Guide

When adding new queries:

1. **Add key to factory** (`queryKeys.ts`):
   ```typescript
   newEntity: {
     all: ['newEntity'] as const,
     list: () => [...queryKeys.newEntity.all, 'list'] as const,
     detail: (id: string) => [...queryKeys.newEntity.all, 'detail', id] as const,
   }
   ```

2. **Use in components**:
   ```typescript
   import { queryKeys } from '../lib/queryKeys';

   useQuery({
     queryKey: queryKeys.newEntity.list(),
     queryFn: fetchFunction,
   });
   ```

3. **Invalidate appropriately**:
   ```typescript
   queryClient.invalidateQueries({ queryKey: queryKeys.newEntity.all });
   ```

## Benefits

1. **Consistent naming**: All query keys follow the same pattern
2. **Type safety**: Query keys are typed with `as const`
3. **Easy invalidation**: Hierarchical structure enables granular or broad invalidation
4. **Discoverable**: Single source of truth for all query keys
5. **Refactorable**: Changing key structure only requires updating the factory
