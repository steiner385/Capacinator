# E2E Test Isolation Guide

## Overview
This guide documents the test isolation patterns and best practices implemented in our E2E test suite to ensure tests can run reliably in isolation and in parallel.

## Key Principles

### 1. Dynamic Test Data Creation
- Each test creates its own unique test data
- No reliance on seed data or pre-existing data
- Use unique prefixes to avoid conflicts

### 2. Test Context Management
- Each test has its own `TestDataContext`
- Tracks all created resources for cleanup
- Ensures complete isolation between tests

### 3. No Hardcoded Dependencies
- No hardcoded UUIDs or IDs
- No `.first()` or `.nth(0)` for selecting data
- Always use specific identifiers

## Implementation Pattern

### Basic Test Structure

```typescript
import { test, expect } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';

test.describe('Feature Tests', () => {
  let testContext: TestDataContext;
  let testData: any;

  test.beforeEach(async ({ testDataHelpers, testHelpers }) => {
    // Create isolated test context
    testContext = testDataHelpers.createTestContext('feature');
    
    // Create test data dynamically
    testData = await testDataHelpers.createBulkTestData(testContext, {
      projects: 2,
      people: 3,
      assignments: 1
    });
    
    // Navigate to page
    await testHelpers.navigateTo('/feature');
  });

  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await testDataHelpers.cleanupTestContext(testContext);
  });

  test('should perform action on specific data', async ({ 
    authenticatedPage, 
    testDataHelpers 
  }) => {
    // Find specific element instead of using .first()
    const row = await testDataHelpers.findByTestData(
      'tbody tr',
      testData.projects[0].name
    );
    
    // Interact with specific element
    await row.locator('button').click();
  });
});
```

## Key Helper Methods

### 1. createTestContext
Creates an isolated context for tracking test data:
```typescript
const testContext = testDataHelpers.createTestContext('prefix');
```

### 2. createBulkTestData
Creates multiple test entities at once:
```typescript
const testData = await testDataHelpers.createBulkTestData(testContext, {
  projects: 2,
  people: 3,
  assignments: 1
});
```

### 3. findByTestData
Finds elements by unique identifiers instead of position:
```typescript
const element = await testDataHelpers.findByTestData(
  'selector',
  uniqueIdentifier
);
```

### 4. selectSpecificOption
Selects dropdown options by text instead of index:
```typescript
await testDataHelpers.selectSpecificOption(
  'select[name="project"]',
  testData.projects[0].name
);
```

### 5. cleanupTestContext
Removes all test data created in the context:
```typescript
await testDataHelpers.cleanupTestContext(testContext);
```

## Common Anti-Patterns to Avoid

### ❌ Don't Use .first()
```typescript
// Bad
const firstRow = page.locator('tbody tr').first();

// Good
const row = await testDataHelpers.findByTestData(
  'tbody tr',
  testData.items[0].name
);
```

### ❌ Don't Use Hardcoded IDs
```typescript
// Bad
const projectId = '123e4567-e89b-12d3-a456-426614174000';

// Good
const project = await testDataHelpers.createTestProject(testContext);
const projectId = project.id;
```

### ❌ Don't Rely on Existing Data
```typescript
// Bad
const projects = await apiContext.get('/api/projects');
const firstProject = projects.data[0];

// Good
const project = await testDataHelpers.createTestProject(testContext, {
  name: 'Test Project'
});
```

### ❌ Don't Select by Index
```typescript
// Bad
await select.selectOption({ index: 1 });

// Good
await testDataHelpers.selectSpecificOption(
  'select',
  specificValue
);
```

## Benefits

1. **Parallel Execution**: Tests can run simultaneously without conflicts
2. **Reliable Results**: No flaky tests due to data dependencies
3. **Easy Debugging**: Each test's data is isolated and traceable
4. **Clean State**: No data pollution between test runs
5. **Maintainability**: Tests are self-contained and easier to understand

## Migration Checklist

When updating existing tests:

- [ ] Remove all `.first()` and `.nth(0)` calls
- [ ] Replace hardcoded IDs with dynamic creation
- [ ] Add test context creation in beforeEach
- [ ] Add cleanup in afterEach
- [ ] Use specific selectors instead of positional ones
- [ ] Create all needed test data dynamically
- [ ] Verify no reliance on seed data

## Examples

### Creating Test Data

```typescript
// Create a project with specific owner
const project = await testDataHelpers.createTestProject(testContext, {
  name: `${testContext.prefix}-Project`,
  owner: testData.people[0]
});

// Create an assignment
const assignment = await testDataHelpers.createTestAssignment(testContext, {
  project: testData.projects[0],
  person: testData.people[0],
  allocation: 50
});
```

### Finding Elements

```typescript
// Find by unique text
const projectRow = await testDataHelpers.findByTestData(
  'tbody tr',
  project.name
);

// Click specific element
await testDataHelpers.clickSpecific(
  '.card',
  project.name
);

// Wait for specific element
await testDataHelpers.waitForElementWithText(
  '.notification',
  'Project created',
  5000
);
```

### Form Interactions

```typescript
// Fill form with test data
await testDataHelpers.fillTestForm({
  name: `${testContext.prefix}-Item`,
  description: 'Test description'
}, testContext);

// Select specific option
await testDataHelpers.selectSpecificOption(
  'select[name="status"]',
  'Active'
);
```

## Debugging Tips

1. **Use descriptive prefixes**: Include test name in prefix for easier identification
2. **Log created IDs**: TestDataHelpers logs all created resources
3. **Check cleanup**: Verify afterEach runs even on test failure
4. **Monitor API calls**: Use response monitoring for debugging

## Future Improvements

1. Add database snapshots for faster setup/teardown
2. Implement parallel test execution configuration
3. Add automatic retry with fresh data on failure
4. Create visual test data inspector tool