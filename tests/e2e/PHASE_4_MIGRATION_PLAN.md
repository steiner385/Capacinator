# Phase 4: E2E Test Migration Plan

## Overview
Phase 4 focuses on migrating all remaining E2E tests to the organized structure and applying test isolation patterns established in Phase 3.

## Current State Analysis

### Test Files Overview
- **Root directory tests**: 50+ test files need migration
- **Files with `.first()`**: 40+ files across root and suites
- **Files with hardcoded UUIDs**: 10 files
- **Duplicate files**: 4 files exist in both root and suites

### Test Organization by Priority

## Migration Steps

### Step 1: Remove Duplicates (Immediate)
These files already exist in suites/ and should be removed from root:
- [ ] `gaps-analysis-accuracy.spec.ts`
- [ ] `navigation.spec.ts`
- [ ] `people.spec.ts`
- [ ] `projects.spec.ts`

### Step 2: Migrate Core Tests (High Priority)

#### 2.1 Data Table Tests
- [ ] Move `02-data-tables.spec.ts` → `suites/core/data-tables.spec.ts`
- [ ] Update to use dynamic test data
- [ ] Remove `.first()` usage

#### 2.2 CRUD Form Tests
- [ ] Move `04-forms-crud.spec.ts` → `suites/crud/forms.spec.ts`
- [ ] Apply test isolation patterns
- [ ] Create dynamic test data

#### 2.3 Navigation Tests
- [ ] Move `09-fixed-navigation.spec.ts` → `suites/core/navigation-fixed.spec.ts`
- [ ] Move `23-navigation-hyperlinks.spec.ts` → `suites/core/navigation-links.spec.ts`
- [ ] Update to use specific selectors

### Step 3: Migrate Feature Tests (Medium Priority)

#### 3.1 Import/Export Features
- [ ] Move `03-excel-import.spec.ts` → `suites/features/excel-import.spec.ts`
- [ ] Move `10-fixed-import.spec.ts` → `suites/features/import-fixed.spec.ts`
- [ ] Move `export-functionality.spec.ts` → `suites/features/export.spec.ts`

#### 3.2 Dashboard & Reporting
- [ ] Move `06-dashboard-charts.spec.ts` → `suites/features/dashboard.spec.ts`
- [ ] Move utilization modal tests → `suites/features/utilization-modals/`
- [ ] Move project roadmap tests → `suites/features/project-roadmap/`

#### 3.3 Phase Management
- [ ] Move `phase-dependencies.spec.ts` → `suites/features/phases/dependencies.spec.ts`
- [ ] Move `phase-duplication.spec.ts` → `suites/features/phases/duplication.spec.ts`
- [ ] Move `phase-boundary-control.spec.ts` → `suites/features/phases/boundary-control.spec.ts`
- [ ] Fix hardcoded UUIDs in all phase tests

### Step 4: Update Existing Suite Tests

#### 4.1 Scenarios (6 files)
- [ ] `suites/scenarios/basic-operations.spec.ts`
- [ ] `suites/scenarios/data-integrity.spec.ts`
- [ ] `suites/scenarios/edge-cases.spec.ts`
- [ ] `suites/scenarios/planning-workflows.spec.ts`
- [ ] `suites/scenarios/ui-interactions.spec.ts`
- [ ] `suites/scenarios/visualization.spec.ts`

#### 4.2 Reports (8 files)
- [ ] Update all report accuracy tests
- [ ] Fix navigation context tests
- [ ] Update comprehensive report tests

#### 4.3 Tables (4 files)
- [ ] Update inline editing tests
- [ ] Fix availability tests
- [ ] Update phase manager tests

### Step 5: Migrate Security & Performance Tests (Lower Priority)
- [ ] Move API security tests → `suites/security/`
- [ ] Move performance tests → `suites/performance/`
- [ ] Fix all hardcoded UUIDs
- [ ] Apply test isolation

## File Organization Structure

```
tests/e2e/
├── suites/
│   ├── core/           # Core functionality
│   │   ├── navigation.spec.ts
│   │   ├── data-tables.spec.ts
│   │   └── table-navigation.spec.ts
│   ├── crud/           # CRUD operations
│   │   ├── assignments.spec.ts ✓
│   │   ├── people.spec.ts ✓
│   │   ├── projects.spec.ts ✓
│   │   └── forms.spec.ts (new)
│   ├── features/       # Feature-specific tests
│   │   ├── dashboard/
│   │   ├── excel-import/
│   │   ├── phases/
│   │   ├── project-roadmap/
│   │   └── utilization-modals/
│   ├── integration/    # Integration tests
│   ├── reports/        # Report tests
│   ├── scenarios/      # Scenario management
│   ├── security/       # Security tests (new)
│   ├── performance/    # Performance tests (new)
│   ├── smoke/          # Quick smoke tests
│   └── tables/         # Table-specific tests
```

## Migration Patterns

### Pattern 1: Basic File Migration
```bash
# Move file
mv tests/e2e/[filename].spec.ts tests/e2e/suites/[category]/[new-name].spec.ts

# Update imports
- import { test, expect } from '@playwright/test';
+ import { test, expect, tags } from '../../fixtures';
+ import { TestDataContext } from '../../utils/test-data-helpers';
```

### Pattern 2: Update Test Structure
```typescript
// Before
test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    const firstRow = page.locator('tr').first();
    await firstRow.click();
  });
});

// After
test.describe('Feature', () => {
  let testContext: TestDataContext;
  let testData: any;

  test.beforeEach(async ({ testDataHelpers, testHelpers }) => {
    testContext = testDataHelpers.createTestContext('feature');
    testData = await testDataHelpers.createBulkTestData(testContext, {
      projects: 1,
      people: 1
    });
    await testHelpers.navigateTo('/');
  });

  test.afterEach(async ({ testDataHelpers }) => {
    await testDataHelpers.cleanupTestContext(testContext);
  });

  test('should do something', async ({ authenticatedPage, testDataHelpers }) => {
    const row = await testDataHelpers.findByTestData('tr', testData.projects[0].name);
    await row.click();
  });
});
```

## Success Metrics

1. **Zero root-level test files** - All tests organized in suites
2. **No `.first()` usage** - All tests use specific selectors
3. **No hardcoded IDs** - All tests create dynamic data
4. **Test isolation** - All tests can run in parallel
5. **Consistent patterns** - All tests follow the same structure

## Timeline Estimate

- Step 1 (Remove duplicates): 30 minutes
- Step 2 (Core tests): 2 hours
- Step 3 (Feature tests): 3 hours
- Step 4 (Update suites): 2 hours
- Step 5 (Security/Performance): 1 hour

**Total estimate**: 8-9 hours

## Next Actions

1. Start with removing duplicate files
2. Create migration helper script
3. Migrate high-priority tests first
4. Update each test to use test isolation
5. Validate tests still pass after migration