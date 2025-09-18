# Phase 4.10 - Dashboard Tests Migration Plan

## Overview
Migrate remaining 3 dashboard tests to the organized structure and ensure they use proper fixtures and dynamic test data.

## Tests to Migrate

### 1. dashboard-api-filtering.spec.ts
- **Type**: API tests for dashboard filtering logic
- **Target**: `suites/features/dashboard/dashboard-api-filtering.spec.ts`
- **Changes Needed**:
  - Update to use custom fixtures from `../../fixtures`
  - Add dynamic test data if needed
  - Ensure proper test isolation

### 2. dashboard-current-projects.spec.ts
- **Type**: UI tests for current projects display
- **Target**: `suites/features/dashboard/dashboard-current-projects.spec.ts`
- **Status**: Already uses custom fixtures
- **Changes Needed**:
  - Move to organized structure
  - Update import paths
  - Verify test isolation

### 3. dashboard-ui-validation.spec.ts
- **Type**: UI validation tests for dashboard components
- **Target**: `suites/features/dashboard/dashboard-ui-validation.spec.ts`
- **Changes Needed**:
  - Update to use custom fixtures
  - Replace TestUtils with standard testHelpers
  - Add proper test isolation

## Migration Steps

1. **Update dashboard-api-filtering.spec.ts**
   - Change imports to use custom fixtures
   - Add testContext if needed
   - Update to use apiContext from fixtures

2. **Move dashboard-current-projects.spec.ts**
   - Update import paths for new location
   - Verify fixture compatibility

3. **Update dashboard-ui-validation.spec.ts**
   - Replace TestUtils with testHelpers
   - Update to use authenticatedPage fixture
   - Add proper test isolation

4. **Verify all tests pass**
   - Run tests individually
   - Check for any hardcoded data dependencies
   - Ensure no cross-test interference

5. **Remove old files**
   - Delete original files from root directory
   - Update any references in other documentation

## Expected Outcome

All dashboard tests will be:
- Located in `suites/features/dashboard/`
- Using consistent fixtures and patterns
- Properly isolated with no data dependencies
- Following the established test structure