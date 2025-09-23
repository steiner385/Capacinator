# E2E Testing Checklist

## Pre-Test Setup ✓

### Environment
- [ ] E2E server running on ports 3110/3120
- [ ] Dev server stopped (to avoid conflicts)
- [ ] Database properly initialized
- [ ] Test data seeds available

### Configuration
- [ ] `.env.e2e` file exists and configured
- [ ] API context initialized with proper headers
- [ ] Base URL set correctly

## Test Structure ✓

### Initialization
- [ ] Import all necessary helpers and page objects
- [ ] Set up `beforeAll` hook for API context
- [ ] Initialize helpers in `beforeEach`
- [ ] Start error monitoring in `beforeEach`

### Cleanup
- [ ] Call `testDataFactory.cleanup()` in `afterEach`
- [ ] Stop error monitoring in `afterEach`
- [ ] Assert no critical errors in `afterEach`
- [ ] Dispose API context in `afterAll`

## Test Implementation ✓

### Page Navigation
- [ ] Use page objects for navigation
- [ ] Wait for page load completion
- [ ] Verify critical elements loaded

### Data Creation
- [ ] Use TestDataFactory for all test data
- [ ] Generate unique names with test prefix
- [ ] Create minimal necessary data
- [ ] Consider data relationships

### UI Interactions
- [ ] Use page object methods
- [ ] Apply smart wait strategies
- [ ] Handle loading states properly
- [ ] Account for animations

### Assertions
- [ ] Test positive cases first
- [ ] Include negative test cases
- [ ] Verify UI state changes
- [ ] Check data persistence

## Advanced Testing ✓

### Error Handling
- [ ] Test network failures
- [ ] Test validation errors
- [ ] Verify error recovery
- [ ] Check error messages

### Performance
- [ ] Test with large datasets
- [ ] Measure operation timings
- [ ] Test concurrent operations
- [ ] Verify no memory leaks

### Accessibility
- [ ] Check form labels
- [ ] Verify ARIA attributes
- [ ] Test keyboard navigation
- [ ] Ensure color contrast

### Cross-browser/Device
- [ ] Test mobile viewport
- [ ] Verify responsive design
- [ ] Check touch interactions
- [ ] Test offline scenarios

## Common Patterns ✓

### Form Testing
```typescript
await page.fillForm({
  'input[name="field1"]': 'value1',
  'input[name="field2"]': 'value2'
});
await page.submitForm();
await helpers.waitForText('success');
```

### Table Operations
```typescript
await helpers.waitForTable();
const rowCount = await helpers.getTableRowCount();
await helpers.clickTableRow('identifier');
const tableData = await helpers.getTableDataWithHeaders();
```

### Modal Handling
```typescript
await helpers.waitForModal();
// ... perform modal operations
await helpers.closeModal();
```

### Error Recovery
```typescript
try {
  await riskyOperation();
} catch (error) {
  await helpers.captureFailureContext('operation-failed');
  // Attempt recovery
  await page.reload();
  await helpers.waitForPageReady();
}
```

## Debugging Tips ✓

### When Tests Fail
1. Check error handler output
2. Review screenshots in `test-results/errors/`
3. Examine HTML captures
4. Check console/network errors

### Common Issues
- **Timing**: Use smart waits, not fixed timeouts
- **Selectors**: Prefer data-testid attributes
- **State**: Ensure clean state between tests
- **Data**: Use unique identifiers

### Performance Optimization
- Batch API calls where possible
- Reuse test data when appropriate
- Minimize page reloads
- Use parallel test execution

## Migration Checklist ✓

When migrating existing tests:

- [ ] Replace direct page interactions with page objects
- [ ] Convert manual waits to smart wait strategies
- [ ] Replace API calls with TestDataFactory
- [ ] Add error monitoring
- [ ] Implement proper cleanup
- [ ] Add accessibility checks
- [ ] Include mobile testing
- [ ] Document any special requirements

## Best Practices Summary ✓

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe what is being tested
3. **Maintainability**: Use page objects and helpers
4. **Reliability**: Handle timing and state properly
5. **Performance**: Keep tests fast and efficient
6. **Coverage**: Test both happy and error paths
7. **Documentation**: Comment complex logic
8. **Reusability**: Share common patterns via helpers

## Quick Reference ✓

### Essential Imports
```typescript
import { test, expect } from '@playwright/test';
import { StandardTestHelpers } from '../helpers/standard-test-helpers';
import { TestDataFactory } from '../helpers/test-data-factory';
import { E2EErrorHandler } from '../helpers/error-handler';
```

### Test Template
```typescript
test.describe('Feature', () => {
  // Setup
  let helpers, errorHandler, testDataFactory;
  
  test.beforeEach(async ({ page }, testInfo) => {
    // Initialize
  });
  
  test.afterEach(async () => {
    // Cleanup
  });
  
  test('should do something', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Common Assertions
```typescript
// Visibility
await expect(element).toBeVisible();
await expect(element).toBeHidden();

// Text content
await expect(element).toHaveText('expected');
await expect(element).toContainText('partial');

// Count
await expect(elements).toHaveCount(5);

// State
await expect(input).toBeEnabled();
await expect(checkbox).toBeChecked();
```

### Debugging Commands
```bash
# Run specific test file
npm run test:e2e -- tests/e2e/my-test.spec.ts

# Run in headed mode
npm run test:e2e -- --headed

# Run with trace
npm run test:e2e -- --trace on

# Debug mode
npm run test:e2e -- --debug
```