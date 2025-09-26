# Skipped Tests Resolution Mapping

## Quick Reference Guide

This document maps each skipped test to its specific resolution in the implementation plan.

### Assignment Phase Alignment Tests (2 tests)
**File**: `tests/integration/assignment-phase-alignment.test.ts`

1. **Test**: "should recalculate assignments when phase dependencies cause cascading changes"
   - **Root Cause**: Cascade service doesn't properly traverse dependency graph
   - **Resolution**: Phase 2.1 - Complete ProjectPhaseCascadeService implementation
   - **Priority**: HIGH

2. **Test**: "should recalculate project-aligned assignments when project aspiration dates change"
   - **Root Cause**: Timeout in checkAssignmentConflicts method
   - **Resolution**: Phase 2.1 - Optimize conflict checking logic
   - **Priority**: HIGH

### Phase Dependencies Performance Tests (2 tests)
**File**: `tests/integration/phase-dependencies-performance.test.ts`

1. **Test**: "should handle complex dependency chain efficiently"
   - **Root Cause**: calculateCascade returns 0 affected phases
   - **Resolution**: Phase 2.1 - Implement proper graph traversal
   - **Priority**: HIGH

2. **Test**: "should handle multiple cascade calculations concurrently"
   - **Root Cause**: Same as above - cascade logic incomplete
   - **Resolution**: Phase 2.1 - Complete cascade implementation
   - **Priority**: HIGH

### Phase Dependencies API Tests (1 test)
**File**: `tests/integration/phase-dependencies-api.test.ts`

1. **Test**: "should calculate cascade effects"
   - **Root Cause**: Cascade service not finding dependencies correctly
   - **Resolution**: Phase 2.1 - Fix dependency graph building
   - **Priority**: MEDIUM

### Scenario Operations Tests (3 tests)
**File**: `tests/integration/__tests__/database/scenario-operations.test.ts`

1. **Test**: "should enforce unique constraint on scenario assignments"
   - **Root Cause**: Constraint doesn't exist in schema
   - **Resolution**: Phase 1.2 - Add unique constraint migration
   - **Priority**: HIGH

2. **Test**: "should compute dates correctly for different assignment modes"
   - **Root Cause**: scenario_assignments_view doesn't exist
   - **Resolution**: Phase 1.1 - Create view migration
   - **Priority**: HIGH

3. **Test**: "should efficiently query scenario assignments"
   - **Root Cause**: scenario_assignments_view doesn't exist
   - **Resolution**: Phase 1.1 - Create view migration
   - **Priority**: HIGH

### ProjectsController Unit Tests (All tests in describe block)
**File**: `tests/unit/server/controllers/ProjectsController.test.ts`

- **Root Cause**: Controller tightly coupled to database with complex raw SQL
- **Resolution**: Phase 5.1 - Extract query builder and repository pattern
- **Priority**: LOW
- **Alternative**: Keep as integration tests only

### PersonDetails Client Tests (4 tests)
**File**: `tests/unit/client/PersonDetails.actionable-insights.test.tsx`

1. **Test**: "should render the workload insights section"
2. **Test**: "should handle person with reduced availability"
3. **Test**: "should show alert for upcoming time off"
4. **Test**: "should display project count and skills count correctly"
   - **Root Cause**: React component test setup issues, missing mocks
   - **Resolution**: Phase 3.1 - Update test setup and mocks
   - **Priority**: LOW

### E2E Tests (Various)
**Files**: Multiple E2E test files

Common patterns:
- **Visual regression tests**: Need VISUAL_REGRESSION env var
- **Performance tests**: Need RUN_PERFORMANCE_TESTS env var
- **Inline editing tests**: Need UI implementation (Phase 4.1)
- **Location filter tests**: Need filter component (Phase 4.2)

## Implementation Order

### Week 1 - Database Infrastructure
- [ ] Create scenario_assignments_view
- [ ] Add unique constraints
- [ ] Update test schemas

### Week 2-3 - Cascade Service
- [ ] Fix dependency graph building
- [ ] Implement date calculations
- [ ] Add circular dependency detection

### Week 4 - Test Infrastructure
- [ ] Create test data builder
- [ ] Fix client test setup
- [ ] Document env variables

### Week 5 - UI Components
- [ ] Implement inline editing
- [ ] Add location filters
- [ ] Complete phase duplication UI

### Week 6 - Architecture
- [ ] Refactor ProjectsController
- [ ] Performance optimizations
- [ ] Final test cleanup

## Success Criteria

- All database views created and indexed
- Cascade service handles all dependency types
- Test data builder covers all scenarios
- UI components fully implemented
- < 5 tests remain skipped (with documented reasons)