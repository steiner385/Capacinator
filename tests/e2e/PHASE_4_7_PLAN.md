# Phase 4.7 Plan: Update Scenario Tests to Use Dynamic Data

## Current State Analysis

### Scenario Tests in Suites Directory (6 files)
These were already organized in Phase 2.3 but still use `.first()` and lack test isolation:
1. `basic-operations.spec.ts` - CRUD operations and view modes
2. `data-integrity.spec.ts` - Data validation and integrity
3. `edge-cases.spec.ts` - Edge case handling
4. `planning-workflows.spec.ts` - Planning workflows
5. `ui-interactions.spec.ts` - UI interaction patterns
6. `visualization.spec.ts` - Graphical visualization

### Scenario Tests in Root Directory (4 files)
These need migration and updating:
1. `enterprise-expansion.spec.ts` - Enterprise expansion scenario
2. `agile-product-development.spec.ts` - Agile development scenario
3. `consulting-services.spec.ts` - Consulting services scenario
4. `enterprise-expansion-simple.spec.ts` - Simplified enterprise test

## Approach

### Step 1: Update Existing Suite Tests
For each test in `tests/e2e/suites/scenarios/`:
1. Add test isolation with `testDataHelpers`
2. Create dynamic test scenarios instead of using `.first()`
3. Replace hardcoded selectors with dynamic data
4. Ensure proper cleanup

### Step 2: Migrate Root Scenario Tests
For each test in root directory:
1. Analyze test functionality
2. Create dynamic test data structure
3. Migrate to appropriate suite location
4. Remove `.first()` usage
5. Add proper test isolation

## Implementation Order

1. **Update Suite Tests** (Priority: High)
   - `basic-operations.spec.ts` - Core CRUD functionality
   - `planning-workflows.spec.ts` - Critical planning features
   - `visualization.spec.ts` - Graph visualization
   - `data-integrity.spec.ts` - Data validation
   - `ui-interactions.spec.ts` - UI patterns
   - `edge-cases.spec.ts` - Edge cases

2. **Migrate Root Tests** (Priority: Medium)
   - `enterprise-expansion.spec.ts` → `suites/scenarios/enterprise.spec.ts`
   - `agile-product-development.spec.ts` → `suites/scenarios/agile.spec.ts`
   - `consulting-services.spec.ts` → `suites/scenarios/consulting.spec.ts`
   - `enterprise-expansion-simple.spec.ts` → Archive (duplicate)

## Key Changes Needed

### 1. Test Isolation Pattern
```typescript
// Before
test.beforeEach(async ({ authenticatedPage, testHelpers }) => {
  await testHelpers.navigateTo('/scenarios');
});

// After
let testContext: TestDataContext;
let testScenarios: any[];

test.beforeEach(async ({ testDataHelpers, testHelpers }) => {
  testContext = testDataHelpers.createTestContext('scenario');
  testScenarios = await createTestScenarios(testContext);
  await testHelpers.navigateTo('/scenarios');
});

test.afterEach(async ({ testDataHelpers }) => {
  await testDataHelpers.cleanupTestContext(testContext);
});
```

### 2. Dynamic Data Selection
```typescript
// Before
const scenarioCard = authenticatedPage.locator('.scenario-card').first();

// After
const testScenario = testScenarios[0];
const scenarioCard = await testDataHelpers.findByTestData(
  '.scenario-card',
  testScenario.name
);
```

### 3. Test Scenario Factory
```typescript
async function createTestScenarios(context: TestDataContext) {
  const scenarios = [];
  for (let i = 0; i < 3; i++) {
    const scenario = await apiContext.post('/api/scenarios', {
      data: {
        name: `${context.prefix}-Scenario-${i + 1}`,
        description: `Test scenario ${i + 1}`,
        status: ['draft', 'active', 'archived'][i],
        parent_scenario_id: i > 0 ? scenarios[0].id : null
      }
    });
    scenarios.push(scenario);
    context.createdIds.scenarios.push(scenario.id);
  }
  return scenarios;
}
```

## Success Criteria

1. All scenario tests use dynamic test data
2. No `.first()` usage remaining
3. Complete test isolation with cleanup
4. Tests can run in parallel
5. Clear test naming and organization
6. Comprehensive coverage maintained

## Estimated Time
- Update 6 suite tests: 2 hours
- Migrate 4 root tests: 1 hour
- Total: 3 hours