# E2E Test Suite Improvement Plan

## Overview
This document outlines a systematic, phased approach to improve the Capacinator E2E test suite, focusing on consolidation, organization, and optimization.

## Current State
- **Total Tests**: 1,465 test cases across 141 files
- **Organization**: Only 10% migrated to organized structure (14 of 141 files)
- **Issues**: Significant duplication, inconsistent patterns, data dependencies
- **Infrastructure**: ✅ Working (profile selection, setup/teardown fixed)

## Phased Improvement Approach

### Phase 1: Analysis and Documentation (Week 1)
**Goal**: Understand the full scope of duplication and create a consolidation map

#### Tasks:
1. **Duplicate Analysis**
   - [ ] Map all assignment test variations (9 files)
   - [ ] Map all report test variations (20+ files)
   - [ ] Map all scenario test variations (17 files)
   - [ ] Document unique test cases vs duplicates

2. **Test Coverage Analysis**
   - [ ] Identify gaps in test coverage
   - [ ] Map tests to features
   - [ ] Document critical vs nice-to-have tests

3. **Create Consolidation Plan**
   - [ ] Group tests by feature area
   - [ ] Identify which tests to keep/merge/remove
   - [ ] Create migration checklist

### Phase 2: Test Consolidation (Week 2-3)
**Goal**: Eliminate duplicates while maintaining coverage

#### Priority Order:
1. **Assignments** (9 → 1 file)
   - Merge into existing `tests/e2e/suites/crud/assignments.spec.ts`
   - Keep unique edge cases
   - Remove redundant basic CRUD tests

2. **Reports** (20+ → 5 files)
   - Already have 5 organized report tests
   - Merge remaining report tests into these

3. **Scenarios** (17 → 3-4 files)
   - Group by: baseline, branching, comparison, merge
   - Consolidate workflow tests

#### Consolidation Process:
```bash
# For each duplicate group:
1. Review all test files in the group
2. Extract unique test cases
3. Add unique cases to organized suite
4. Verify coverage maintained
5. Delete old test files
6. Run tests to ensure nothing broken
```

### Phase 3: Fix Data Dependencies (Week 4)
**Goal**: Make tests reliable and independent

#### Tasks:
1. **Audit Failing Tests**
   - [ ] Identify tests expecting specific data
   - [ ] Document data requirements

2. **Implement Test Data Strategies**
   - [ ] Create test data factories
   - [ ] Add data setup in beforeEach hooks
   - [ ] Use API to seed specific test data

3. **Update Test Patterns**
   ```typescript
   // Before
   test('should show projects', async ({ page }) => {
     await page.goto('/projects');
     expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
   });

   // After
   test('should show projects', async ({ page, testData }) => {
     // Create test project
     const project = await testData.createProject();
     
     await page.goto('/projects');
     await expect(page.locator(`text=${project.name}`)).toBeVisible();
   });
   ```

### Phase 4: Complete Migration (Week 5-6)
**Goal**: Move all valuable tests to organized structure

#### Migration Strategy:
1. **Core Features First**
   - Navigation (✅ Done)
   - Authentication
   - Dashboard
   - Settings

2. **Business Features**
   - Projects (partial → complete)
   - People (partial → complete)
   - Assignments (✅ Done)
   - Scenarios
   - Reports (partial → complete)

3. **Advanced Features**
   - Phase dependencies
   - Notifications
   - Import/Export
   - API tests

#### Target Structure:
```
tests/e2e/suites/
├── core/
│   ├── auth.spec.ts
│   ├── navigation.spec.ts ✅
│   ├── dashboard.spec.ts
│   └── settings.spec.ts
├── crud/
│   ├── projects.spec.ts ✅
│   ├── people.spec.ts ✅
│   ├── assignments.spec.ts ✅
│   └── scenarios.spec.ts
├── features/
│   ├── phase-dependencies.spec.ts
│   ├── notifications.spec.ts
│   ├── import-export.spec.ts
│   └── permissions.spec.ts
├── reports/
│   └── [5 files] ✅
├── workflows/
│   ├── project-planning.spec.ts
│   ├── resource-allocation.spec.ts
│   └── scenario-comparison.spec.ts
├── api/
│   ├── contracts.spec.ts
│   └── security.spec.ts
└── smoke/
    └── smoke-tests.spec.ts ✅
```

### Phase 5: Optimization (Week 7)
**Goal**: Improve test execution speed and reliability

#### Tasks:
1. **Parallel Execution Groups**
   ```javascript
   // playwright.config.ts
   projects: [
     { name: 'setup', testMatch: /global.setup\.ts/ },
     { name: 'smoke', testMatch: /smoke/, dependencies: ['setup'] },
     { name: 'core', testMatch: /core/, dependencies: ['setup'] },
     { name: 'crud', testMatch: /crud/, dependencies: ['setup'] },
     { name: 'features', testMatch: /features/, dependencies: ['crud'] },
   ]
   ```

2. **Test Sharding for CI**
   ```yaml
   # .github/workflows/e2e.yml
   strategy:
     matrix:
       shard: [1, 2, 3, 4]
   steps:
     - run: npm run test:e2e -- --shard=${{ matrix.shard }}/4
   ```

3. **Performance Optimizations**
   - [ ] Reduce wait times
   - [ ] Optimize selectors
   - [ ] Reuse authentication state
   - [ ] Minimize page reloads

### Phase 6: Maintenance System (Ongoing)
**Goal**: Prevent regression to current state

1. **Documentation**
   - [ ] Test writing guidelines
   - [ ] Naming conventions
   - [ ] Best practices

2. **Code Review Checklist**
   - [ ] No duplicate tests
   - [ ] Follows organized structure
   - [ ] Has proper data setup
   - [ ] Uses test fixtures

3. **Metrics Tracking**
   - Test execution time
   - Flaky test rate
   - Coverage percentage
   - Maintenance burden

## Success Metrics

### Short Term (1 month)
- Reduce test files from 141 to ~30-40
- Eliminate all duplicate tests
- Fix all data dependency issues
- Achieve 95%+ test pass rate

### Medium Term (3 months)
- All tests in organized structure
- Test execution under 10 minutes
- Zero flaky tests
- Clear test documentation

### Long Term (6 months)
- Automated test quality checks
- Self-healing test capabilities
- Comprehensive test reporting
- Team adoption of best practices

## Implementation Schedule

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Analysis | Duplication map, consolidation plan |
| 2-3 | Consolidation | Remove 100+ duplicate test files |
| 4 | Data Fix | Reliable test data setup |
| 5-6 | Migration | All tests in organized structure |
| 7 | Optimization | Sub-10 minute execution |
| 8+ | Maintenance | Ongoing quality system |

## Next Steps

1. Begin Phase 1 analysis immediately
2. Create tracking spreadsheet for test inventory
3. Set up weekly progress reviews
4. Assign team members to specific phases
5. Establish success criteria for each phase

---

*This plan is designed to be iterative. Adjust timelines and priorities based on discoveries during implementation.*