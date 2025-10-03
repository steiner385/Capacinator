# Skipped Tests Analysis

## Summary
Total skip calls found: 70 (includes both test.skip and describe.skip)
- The discrepancy with the reported 37 skipped tests is because:
  1. Some skips are conditional and may not always execute
  2. describe.skip counts as one skip but contains multiple tests
  3. Some tests have multiple skip calls in different branches

## Categories of Skipped Tests

### 1. **Utilization Modal Tests** (30 skipped tests)
These tests are conditionally skipped when certain UI elements or data conditions aren't met.

#### utilization-modals-basic.spec.ts (2 tests)
- Line 122: `test.skip()` - No over-utilized people found in test data
- Line 167: `test.skip()` - No under-utilized people found in test data

#### utilization-modals-flexible.spec.ts (3 tests)
- Line 28: `test.skip('No over-utilized person found in test data')`
- Line 61: `test.skip('No under-utilized person with Add Projects button found')`
- Line 101: `test.skip('Location filter not found')`

#### utilization-modals-focused.spec.ts (6 tests)
- Line 41: `test.skip('No Add Projects functionality available to test')`
- Line 121: `test.skip('No Reduce Load functionality available to test')`
- Line 184: `test.skip('No Add Projects functionality available')`
- Line 198: `test.skip('No assignable projects available')`
- Line 252: `test.skip('No Reduce Load functionality available')`
- Line 266: `test.skip('No removable assignments available')`

#### utilization-modals-enhanced.spec.ts (6 tests)
- Line 120: `test.skip('No person with available capacity found')`
- Line 132: `test.skip('No assignable projects available')`
- Line 360: `test.skip('No person with removable assignments found')`
- Line 372: `test.skip('No removable assignments available')`
- Line 467: `test.skip('No team members found for rapid interaction test')`
- Line 506: `test.skip('No team members found for persistence test')`

#### utilization-modals-comprehensive.spec.ts (10 tests)
- Line 233: `test.skip()` in "should successfully remove assignment and refresh data" - No person with assignments found
- Line 302: `test.skip()` in "should display accurate role information for assignments" - No person with assignments found
- Line 345: `test.skip()` in "should handle empty assignments gracefully" - No person without assignments found
- Line 386: `test.skip()` in "should display modal with project recommendations" - No under-utilized person found
- Line 441: `test.skip()` in "should successfully create assignment and refresh data" - No under-utilized person found
- Line 461: `test.skip()` in "should successfully create assignment and refresh data" - No assignable projects found
- Line 599: `test.skip()` in "should maintain data consistency between modals and table" - No person with assignments found
- Line 638: `test.skip()` in "should handle rapid modal opening/closing without errors" - No person to test with
- Line 692: `test.skip()` in "should verify database state after operations" - No person with assignments found
- Line 740: `test.skip()` in "should verify database state after operations" - No assignable projects available

### 2. **Assignment Inline Editing Tests** (11 tests)
Tests skipped when inline editing UI elements aren't available.

#### assignment-inline-editing.spec.ts
- Line 41: `test.skip('No inline editable allocation fields found')`
- Line 65: `test.skip('No inline editable allocation fields found')`
- Line 83: `test.skip('No inline editable allocation fields found')`
- Line 104: `test.skip('No inline editable notes fields found')`
- Line 125: `test.skip('No inline editable notes fields found')`
- Line 143: `test.skip('No inline editable fields found')`
- Line 161: `test.skip('No inline editable fields found')`
- Line 203: `test.skip('No inline editable fields found')`
- Line 233: `test.skip('Not enough inline editable fields for concurrent edit test')`
- Line 280: `test.skip('Not enough rows to test sorting')`
- Line 304: `test.skip('Not enough editable fields to test navigation')`

### 3. **Phase Dependencies Tests** (4 tests)
Tests related to cascade service implementation that needs investigation.

#### phase-dependencies-api.test.ts
- Line 296: `test.skip('should reject circular dependency')`
- Line 433: `test.skip('should calculate cascade effects - SKIPPED: Cascade service needs investigation')`

#### phase-dependencies-performance.test.ts
- Line 113: `test.skip('should handle complex dependency chain efficiently - SKIPPED: Cascade service implementation incomplete')`
- Line 428: `test.skip('should handle multiple cascade calculations concurrently - SKIPPED: Cascade service implementation incomplete')`

### 4. **Scenario Tests** (7 tests)
Tests for scenario comparison modal and basic operations.

#### scenario-comparison-modal.spec.ts (4 tests)
- Line 97: `test.skip()` - Test name needs investigation
- Line 170: `test.skip()` - Test name needs investigation
- Line 212: `test.skip()` - Test name needs investigation
- Line 242: `test.skip()` - Test name needs investigation

#### basic-operations.spec.ts (3 tests)
- Line 453: `test.skip()` - No draft scenario found
- Line 501: `test.skip()` - No bulk select button found
- Line 559: `test.skip()` - Test name needs investigation

### 5. **Unit Tests** (6 tests)
PersonDetails actionable insights feature tests.

#### PersonDetails.actionable-insights.test.tsx
- Line 203: `describe.skip('PersonDetails Actionable Insights')` - Entire suite skipped
- Line 210: `it.skip('should render the workload insights section')`
- Line 454: `it.skip('should handle person with reduced availability')`
- Line 484: `it.skip('should show alert for upcoming time off')`
- Line 520: `it.skip('should display project count and skills count correctly')`

#### ProjectsController.test.ts
- Line 10: `describe.skip('ProjectsController - SKIPPED: Controller tightly coupled to database, use integration tests instead')`

### 6. **Integration Tests** (3 tests)
Database and service-related tests with specific issues.

#### assignment-phase-alignment.test.ts
- Line 473: `it.skip('should recalculate project-aligned assignments when project aspiration dates change - SKIPPED: hanging due to transaction/locking issue')`

#### scenario-operations.test.ts
- Line 213: `it.skip('should enforce unique constraint on scenario assignments - SKIPPED: SQLite test DB not enforcing constraints')`

#### AuditService.undo.test.ts (2 tests)
- Line 423: `test.skip('should handle cascading updates correctly')`
- Line 484: `test.skip('should handle undo of record recreation scenario')`

### 7. **Other Tests** (11 tests)

#### assignments.spec.ts (2 tests)
- Line 86: `test.skip('No roles available')`
- Line 446: `test.skip('No roles available')`

#### demand-report-charts.spec.ts (4 tests)
- Line 75: `test.skip('should update charts when date range changes')`
- Line 79: `test.skip('should display chart tooltips on hover')`
- Line 99: `test.skip('should handle empty state gracefully')`
- Line 103: `test.skip('should export chart data')`

#### Other Individual Tests
- 25-quick-smoke-test.spec.ts Line 106: `test.skip('No add buttons found on projects page')`
- standard-test-template.spec.ts Line 199: `test.skip(!process.env.VISUAL_REGRESSION, 'Visual regression not enabled')`
- advanced-features.spec.ts Line 346: `test.skip()`
- load-tests.spec.ts Line 280: `test.skip('${tags.performance} ${tags.slow} should handle large dataset operations')`
- ProjectPhaseDependenciesController.test.ts Line 63: `it.skip('should fetch all dependencies with pagination')`

## Recommendations

### Tests to Remove
1. **PersonDetails.actionable-insights.test.tsx** - Entire describe block is skipped, feature likely removed or redesigned
2. **ProjectsController.test.ts** - Explicitly states to use integration tests instead
3. **utilization-modals-comprehensive.spec.ts** - 10 tests with no descriptive skip reasons, needs investigation

### Tests to Revive
1. **Phase Dependencies Tests** - Important for cascade functionality, needs cascade service implementation
2. **Scenario Comparison Modal Tests** - Core feature that should be tested
3. **Demand Report Charts Tests** - Chart functionality is important for reporting

### Tests to Keep Skipped (Conditional)
1. **Utilization Modal Tests** - These are conditionally skipped based on test data, which is appropriate
2. **Assignment Inline Editing Tests** - Conditionally skipped when UI elements aren't present
3. **Visual Regression Test** - Appropriately skipped when environment variable not set

### Tests Needing Investigation
1. **assignment-phase-alignment.test.ts** - Transaction/locking issue needs resolution
2. **scenario-operations.test.ts** - SQLite constraint enforcement issue
3. **AuditService.undo.test.ts** - Cascading updates functionality

## Action Items

### Immediate Actions (Quick Wins)
1. **Remove obsolete test files:**
   - `tests/unit/client/PersonDetails.actionable-insights.test.tsx` (entire suite skipped)
   - `tests/unit/server/controllers/ProjectsController.test.ts` (explicitly says to use integration tests)

2. **Update conditionally skipped tests to be more robust:**
   - All utilization modal tests should have better test data setup to avoid skips
   - Assignment inline editing tests need consistent UI element availability

### Medium Priority
3. **Fix Phase Dependencies Tests (4 tests):**
   - Implement the cascade service properly
   - These are important for project dependency functionality

4. **Enable Demand Report Charts Tests (4 tests):**
   - These provide valuable coverage for reporting features
   - Likely just need proper test data or mock setup

5. **Fix Database-related Integration Tests:**
   - `assignment-phase-alignment.test.ts` - resolve transaction/locking issue
   - `scenario-operations.test.ts` - fix SQLite constraint enforcement

### Lower Priority
6. **Keep these tests conditionally skipped:**
   - Visual regression test (environment-dependent)
   - Performance/load tests (resource-intensive)
   - Tests that skip when UI elements aren't present (appropriate behavior)

## Summary Recommendation
Out of 70 skip calls:
- **Remove completely:** ~7 tests (obsolete features)
- **Fix and enable:** ~15 tests (important functionality)
- **Keep conditionally skipped:** ~48 tests (data-dependent or environment-specific)

This would reduce the actual skipped test count from 37 to approximately 20-25, which would be mostly conditional skips that are appropriate for the test strategy.