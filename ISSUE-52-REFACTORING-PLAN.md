# Issue #52: Refactor Large Controllers Exceeding 600 Lines

## Executive Summary

This document outlines the strategic plan for refactoring 15 server controllers totaling 12,438+ lines of code into focused, maintainable services following the single responsibility principle.

**Status**: In Progress
**Priority**: P2 (Medium)
**Category**: Architecture, Maintainability

## Current State Analysis

### Controllers Exceeding 300 Lines (Target Threshold)

1. **ImportController** - 1,386 lines → 250 lines target (82% reduction)
2. **AssignmentsController** - 1,156 lines → 280 lines target (76% reduction)
3. **ScenariosController** - 1,107 lines → 250 lines target (77% reduction)
4. **ProjectsController** - 745 lines → 280 lines target (62% reduction)
5. **ProjectPhasesController** - 650 lines → 200 lines target (69% reduction)
6. **ResourceTemplatesController** - 583 lines → 200 lines target (66% reduction)
7. **AvailabilityController** - 573 lines → 220 lines target (62% reduction)
8. **UserPermissionsController** - 537 lines → 200 lines target (63% reduction)
9. **ProjectTypeHierarchyController** - 505 lines → 220 lines target (56% reduction)
10. **BaseController** - 489 lines → 250 lines target (49% reduction)
11. **ProjectSubTypesController** - 419 lines → 180 lines target (57% reduction)
12. **TestContextController** - 462 lines → 180 lines target (61% reduction)
13. **NotificationsController** - 351 lines → 150 lines target (57% reduction)
14. **RolesController** - 330 lines → 150 lines target (55% reduction)

**Total**: 12,438 lines across 14 main controllers + base class

## Implementation Phases

### Phase 1: Critical Controllers (ImportController, AssignmentsController, ScenariosController)

**Goal**: Establish the extraction pattern with the three largest, most complex controllers.

#### 1.1 ImportController Extraction

**New Services to Create**:
- `ImportSettingsService` - Settings persistence and validation
- `ExcelTemplateGeneratorService` - Dynamic Excel template generation
- `ImportHistoryService` - Import history tracking and queries
- `ImportOrchestrationService` - Multi-step import orchestration

**Status**: `ImportSettingsService` created ✅

#### 1.2 AssignmentsController Extraction

**New Services to Create**:
- `AssignmentFilterService` - Complex query building with filtering
- `AssignmentComputationService` - Date calculations and derived fields
- `AssignmentValidationService` - Business logic validation
- `AssignmentConflictService` - Conflict detection and resolution
- `AssignmentRecommendationService` - Intelligent recommendations

#### 1.3 ScenariosController Extraction

**New Services to Create**:
- `ScenarioBranchingService` - Parent/child relationship and data branching
- `ScenarioValidationService` - Scenario data validation
- `ScenarioHierarchyService` - Hierarchy tree building and traversal
- `ScenarioDataService` - Response formatting and metadata enrichment

### Phase 2: Large Controllers (ProjectsController, ProjectPhasesController, ResourceTemplatesController, AvailabilityController)

**Goal**: Apply established pattern to controllers >500 lines.

### Phase 3: Medium Controllers (UserPermissionsController, ProjectTypeHierarchyController, ProjectSubTypesController, TestContextController, NotificationsController, RolesController)

**Goal**: Complete controller refactoring, ensure all <300 lines.

### Phase 4: BaseController Optimization

**Goal**: Optimize base class and extract composable traits as needed.

## Common Extraction Patterns

### 1. Query Building Services
Consolidate complex `query()` chains with multiple `.where()` conditions and conditional logic.

```typescript
// Before (50-100 lines in controller)
let query = this.db('table').join(...).where(...).if(...).where(...)

// After (1-2 lines)
const query = queryService.buildQuery(filters);
```

### 2. Validation Services
Combine schema validation, cross-field validation, and business rule validation.

```typescript
// Validates:
- Required fields and types
- Cross-field constraints (date ranges, dependencies)
- Reference existence (foreign keys)
- Business rules (allocation limits, status transitions)
```

### 3. Data Transformation Services
Format, enrich, and compute derived data fields.

```typescript
// Transforms:
- Computed fields (duration = end - start)
- Enrichment (related data queries)
- Date/timezone transformations
- Aggregations and summarizations
```

### 4. Workflow/Orchestration Services
Coordinate multi-step operations with error handling and transactions.

```typescript
// Orchestrates:
- Multi-step workflows
- Error handling at each step
- Transaction boundaries
- Compensating actions
```

### 5. Conflict Detection Services
Identify business rule violations and constraint conflicts.

```typescript
// Detects:
- Over-allocation conflicts
- Date range overlaps
- Approval status conflicts
- Permission constraints
```

## Architecture Principles

### Service Design
- **Single Responsibility**: Each service has one clear purpose
- **Dependency Injection**: Services receive `Knex` database instance in constructor
- **Stateless**: Services don't maintain state across requests
- **Testable**: Complex logic extracted to services for unit testing

### Dependency Injection Pattern
```typescript
class MyService {
  constructor(private db: Knex) {}
  async method() { /* business logic */ }
}

// In controller
class MyController extends BaseController {
  constructor(container?: ServiceContainer) {
    super({}, { container });
    this.service = new MyService(container?.getDb());
  }
}
```

### No API Breaking Changes
- All extraction done internally
- Existing controller endpoints remain unchanged
- Response formats unchanged
- Gradual migration of logic

## Testing Strategy

### Service Unit Tests
```
Location: src/server/services/__tests__/[ServiceName].test.ts

Structure:
- Setup and fixtures
- Happy path tests
- Edge cases
- Error handling
- Boundary conditions
```

### Coverage Goals
- Service layer: 85%+ coverage
- Controller methods: 90%+ coverage
- Integration: All existing tests pass
- E2E: All Playwright tests pass

## Quality Gates

Before merging each phase:

1. **Code Quality**
   - Target controllers ≤ 300 lines
   - ESLint passing
   - No `any` types in new code
   - Type coverage maintained

2. **Test Coverage**
   - New services: 85%+ coverage
   - Existing tests: All passing
   - No regressions

3. **Performance**
   - Query count unchanged
   - Response times within 5% of baseline
   - No N+1 queries

## Progress Tracking

### Phase 1 Status
- [ ] ImportController extracted (target: 4 services)
  - [x] ImportSettingsService created
  - [ ] ExcelTemplateGeneratorService
  - [ ] ImportHistoryService
  - [ ] ImportOrchestrationService
  - [ ] Update ImportController to use services
  - [ ] Unit tests created
  - [ ] E2E tests passing

- [ ] AssignmentsController extracted (target: 5 services)
- [ ] ScenariosController extracted (target: 4 services)
- [ ] Phase 1 PR merged

### Phase 2 Status
- [ ] ProjectsController extracted
- [ ] ProjectPhasesController extracted
- [ ] ResourceTemplatesController extracted
- [ ] AvailabilityController extracted
- [ ] Phase 2 PR merged

### Phase 3 Status
- [ ] 6 medium controllers extracted
- [ ] All controllers ≤ 300 lines verified
- [ ] Phase 3 PR merged

### Phase 4 Status
- [ ] BaseController optimized
- [ ] All tests passing
- [ ] Phase 4 PR merged

## Risk Mitigation

### Risk 1: API Breaking Changes
**Mitigation**: Extract services without changing controller endpoints. All existing API contracts remain identical.

### Risk 2: Regression Testing
**Mitigation**: Maintain and run full Playwright E2E test suite after each phase. Add new service unit tests alongside existing tests.

### Risk 3: Circular Dependencies
**Mitigation**: Use ServiceContainer for cross-service access. Maximum 2-level service dependencies. Review in PR.

### Risk 4: Database Boundaries
**Mitigation**: Document transaction boundaries per service. Use ServiceContainer.transaction() for multi-service operations.

### Risk 5: Incomplete Extraction
**Mitigation**: Create extraction checklist per controller. Verify no logic remains after extraction. Run code coverage on controllers post-refactor.

## Implementation Roadmap

### Recommended Sequence
1. Create all Phase 1 services with unit tests
2. Update Phase 1 controllers to use services
3. Run full test suite and verify no regressions
4. Submit PR for Phase 1
5. Repeat for Phases 2-4

### Estimated Effort
- Phase 1 (3 critical controllers): 5-7 days
- Phase 2 (4 large controllers): 4-5 days
- Phase 3 (6 medium controllers): 4-5 days
- Phase 4 (BaseController): 1-2 days
- **Total**: 2-3 weeks of focused development

## Key Files

### Created Services
- `src/server/services/import/ImportSettingsService.ts`

### Controllers to Refactor
- `src/server/api/controllers/ImportController.ts` (1,386 lines)
- `src/server/api/controllers/AssignmentsController.ts` (1,156 lines)
- `src/server/api/controllers/ScenariosController.ts` (1,107 lines)
- `src/server/api/controllers/ProjectsController.ts` (745 lines)
- ... and 10 more

### Test Files to Create/Update
- `src/server/services/__tests__/ImportSettingsService.test.ts`
- And corresponding test files for all new services

## Next Steps

1. **Continue Phase 1**
   - Create `ExcelTemplateGeneratorService` from ImportController template logic
   - Create `ImportHistoryService` for history tracking
   - Create `ImportOrchestrationService` for import workflow orchestration
   - Write comprehensive unit tests (85%+ coverage target)
   - Update ImportController to delegate to services
   - Verify ImportController reduces to <300 lines

2. **Verify No Breaking Changes**
   - Run full test suite: `npm test`
   - Run E2E tests: `npm run test:e2e`
   - Verify existing API contracts unchanged

3. **Create PR**
   - Include all Phase 1 changes
   - Reference Issue #52
   - Document extraction strategy and rationale

4. **Progress to Phase 2**
   - Apply same pattern to remaining large controllers
   - Maintain consistent service naming and structure

## References

- Issue: #52 - Refactor large controllers exceeding 600 lines
- Architecture: ServiceContainer dependency injection pattern
- Reference Implementation: `AssignmentRecalculationService` (well-structured 423-line service)
- Established Patterns: Service organization in `/src/server/services/` by domain

---

**Last Updated**: 2025-12-17
**Status**: Phase 1 In Progress
**Foundation Service Created**: ImportSettingsService ✅
