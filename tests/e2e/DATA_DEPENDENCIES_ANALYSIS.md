# E2E Test Data Dependencies Analysis

## Current Issues Identified

### 1. Hardcoded UUIDs
- **Found in 8 files** with UUID `123e4567-e89b-12d3-a456-426614174000`
- Files affected:
  - phase-duplication.spec.ts
  - api-corruption-prevention.spec.ts
  - api-security-validation.spec.ts
  - business-rule-validation.spec.ts
  - security-vulnerability-testing.spec.ts
  - performance-load-testing.spec.ts
  - authentication-security.spec.ts
  - database-transaction-safety.spec.ts

### 2. Reliance on `.first()` and `.nth(0)`
- **Found in 255 occurrences across 23 files**
- This pattern assumes specific data exists and in a specific order
- Makes tests fragile and order-dependent
- Can fail if:
  - No data exists
  - Data order changes
  - Other tests modify the data

### 3. Test Data Generator Status
- **Good**: Already have a comprehensive `TestDataGenerator` class
- **Good**: Supports multiple scenarios (Enterprise, Agile, Consulting)
- **Good**: Has cleanup methods
- **Issue**: Not consistently used across all tests
- **Issue**: Some tests still rely on pre-existing seed data

## Key Problems to Fix

### 1. Order Dependency
Tests using `.first()` assume:
- Data exists in the database
- Data is in a specific order
- No other tests have modified the data

### 2. Hardcoded IDs
Tests with hardcoded UUIDs:
- Will fail if that specific ID doesn't exist
- Cannot run in isolation
- Cannot run in parallel

### 3. Data Pollution
Tests that create data without cleanup:
- Affect subsequent tests
- Make test results unpredictable
- Prevent parallel execution

### 4. Implicit Dependencies
Tests that assume certain data exists:
- Project types
- Locations
- Roles
- Users

## Recommended Solutions

### 1. Dynamic Test Data Creation
- Every test should create its own data
- Use unique identifiers (timestamps, random strings)
- Clean up after each test

### 2. Replace `.first()` with Specific Selectors
Instead of:
```typescript
authenticatedPage.locator('.scenario-card').first()
```

Use:
```typescript
const testScenario = await testHelpers.createScenario('Test Scenario ' + Date.now());
authenticatedPage.locator(`.scenario-card:has-text("${testScenario.name}")`)
```

### 3. Test Isolation Pattern
```typescript
test.beforeEach(async ({ testHelpers }) => {
  // Create test-specific data
  testData = await testHelpers.createTestData({
    prefix: `test-${Date.now()}`,
    scenarios: 1,
    projects: 2,
    people: 3
  });
});

test.afterEach(async ({ testHelpers }) => {
  // Clean up test-specific data
  await testHelpers.cleanupTestData(testData);
});
```

### 4. Remove Hardcoded IDs
Replace:
```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000';
```

With:
```typescript
const user = await testHelpers.createUser({
  name: 'Test User ' + Date.now()
});
const userId = user.id;
```

## Files Needing Updates (Priority Order)

### High Priority (Core CRUD Tests)
1. `/suites/crud/assignments.spec.ts` (18 occurrences)
2. `/suites/crud/projects.spec.ts` (18 occurrences)
3. `/suites/crud/people.spec.ts` (9 occurrences)

### Medium Priority (Integration Tests)
4. `/suites/integration/assignment-workflows.spec.ts` (18 occurrences)
5. `/suites/scenarios/*.spec.ts` (6 files, ~50 total occurrences)

### Lower Priority (Reporting/UI Tests)
6. `/suites/reports/*.spec.ts` (8 files, ~70 occurrences)
7. `/suites/tables/*.spec.ts` (4 files, ~50 occurrences)

## Implementation Plan

### Step 1: Enhance Test Helpers
1. Create a comprehensive test helper module
2. Include data creation methods for all entities
3. Include cleanup methods
4. Add unique identifier generation

### Step 2: Update High-Priority Tests
1. Start with CRUD tests (most fundamental)
2. Replace `.first()` with specific selectors
3. Add proper setup/teardown
4. Remove hardcoded IDs

### Step 3: Update Integration Tests
1. Ensure each test creates its own scenario
2. Use dynamic data throughout
3. Add proper isolation

### Step 4: Update Remaining Tests
1. Reports and tables can use more generic patterns
2. Focus on making them resilient to data changes
3. Add fallbacks where appropriate

### Step 5: Add Test Data Validation
1. Verify data was created successfully
2. Add assertions for data existence
3. Better error messages when data is missing

## Success Criteria

1. ✅ No hardcoded UUIDs in tests
2. ✅ All tests create their own data
3. ✅ All tests clean up after themselves
4. ✅ Tests can run in any order
5. ✅ Tests can run in parallel
6. ✅ No reliance on seed data
7. ✅ Clear error messages when data issues occur