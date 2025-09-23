# E2E Test Standardization Guide

## Overview

This guide helps migrate existing E2E tests to use our new standardized testing patterns and utilities.

## New Components Available

### 1. StandardTestHelpers (`helpers/standard-test-helpers.ts`)
- Smart wait strategies
- Common UI operations
- Error recovery
- Performance utilities

### 2. TestDataFactory (`helpers/test-data-factory.ts`)
- Consistent test data creation
- Automatic cleanup
- Scenario-based data generation
- Bulk data creation

### 3. E2EErrorHandler (`helpers/error-handler.ts`)
- Console error monitoring
- Network error tracking
- Page error capture
- Screenshot/HTML capture on failure

### 4. Page Objects
- `BasePage` - Base class for all page objects
- `PeoplePage` - People management page
- `UtilizationReportPage` - Utilization report page
- Add more as needed

## Migration Steps

### Step 1: Convert Direct Page Interactions to Page Objects

**Before:**
```typescript
await page.goto('/people');
await page.click('button:has-text("Add Person")');
await page.fill('input[name="name"]', 'Test User');
await page.click('button[type="submit"]');
```

**After:**
```typescript
const peoplePage = new PeoplePage(page);
await peoplePage.navigate();
await peoplePage.clickAddPerson();
await peoplePage.fillPersonForm({ name: 'Test User' });
await peoplePage.savePerson();
```

### Step 2: Replace Manual Waits with Smart Wait Strategies

**Before:**
```typescript
await page.waitForTimeout(2000);
await page.waitForSelector('.loading', { state: 'hidden' });
```

**After:**
```typescript
const helpers = new StandardTestHelpers(page);
await helpers.waitForLoadingToComplete();
await helpers.waitForPageReady();
```

### Step 3: Use Test Data Factory Instead of Manual API Calls

**Before:**
```typescript
const response = await page.request.post('/api/people', {
  data: {
    name: 'Test User',
    email: 'test@example.com'
  }
});
const person = await response.json();
```

**After:**
```typescript
const testDataFactory = new TestDataFactory(apiContext);
const person = await testDataFactory.createPerson({
  name: 'Test User',
  email: 'test@example.com'
});
// Cleanup happens automatically in afterEach
```

### Step 4: Add Error Monitoring

**Before:**
```typescript
test('should do something', async ({ page }) => {
  // Test code
});
```

**After:**
```typescript
test('should do something', async ({ page }, testInfo) => {
  const errorHandler = new E2EErrorHandler(page, testInfo);
  errorHandler.startMonitoring();
  
  try {
    // Test code
  } finally {
    errorHandler.stopMonitoring();
    await errorHandler.assertNoCriticalErrors();
  }
});
```

### Step 5: Standardize Test Structure

**Before:**
```typescript
test.describe('Random Tests', () => {
  test('test 1', async ({ page }) => {
    // Setup inline
    // Test code
    // Manual cleanup
  });
});
```

**After:**
```typescript
test.describe('Feature - Description', () => {
  let helpers: StandardTestHelpers;
  let testDataFactory: TestDataFactory;
  
  test.beforeEach(async ({ page }) => {
    helpers = new StandardTestHelpers(page);
    testDataFactory = new TestDataFactory(apiContext);
  });
  
  test.afterEach(async () => {
    await testDataFactory.cleanup();
  });
  
  test('should perform specific action', async ({ page }) => {
    // Arrange
    const testData = await testDataFactory.createPerson();
    
    // Act
    await peoplePage.navigate();
    await peoplePage.searchPerson(testData.name);
    
    // Assert
    await expect(page.locator(`text="${testData.name}"`)).toBeVisible();
  });
});
```

## Common Patterns to Replace

### 1. Waiting for Elements

**Old:**
```typescript
await page.waitForSelector('.some-element');
const element = page.locator('.some-element');
```

**New:**
```typescript
const element = await helpers.waitForElement('.some-element');
```

### 2. Table Operations

**Old:**
```typescript
const rows = await page.locator('table tbody tr').count();
await page.click('table tbody tr:first-child');
```

**New:**
```typescript
const rowCount = await helpers.getTableRowCount();
await helpers.clickTableRow(0); // or identifier string
```

### 3. Modal Handling

**Old:**
```typescript
await page.waitForSelector('[role="dialog"]');
await page.click('[role="dialog"] button:has-text("Close")');
```

**New:**
```typescript
await helpers.waitForModal();
await helpers.closeModal();
```

### 4. Form Operations

**Old:**
```typescript
await page.fill('#name', 'Test');
await page.fill('#email', 'test@example.com');
await page.selectOption('#role', 'admin');
```

**New:**
```typescript
await helpers.fillForm({
  '#name': 'Test',
  '#email': 'test@example.com'
});
await helpers.selectOption('#role', 'admin');
```

## Benefits of Standardization

1. **Consistency**: All tests follow the same patterns
2. **Maintainability**: Changes to UI selectors only need updates in page objects
3. **Reliability**: Smart wait strategies reduce flakiness
4. **Debugging**: Better error capture and reporting
5. **Reusability**: Common operations are encapsulated in helpers
6. **Performance**: Optimized wait strategies and parallel operations
7. **Cleanup**: Automatic test data cleanup prevents pollution

## Next Steps

1. Start with new tests - use the template
2. Gradually migrate existing tests during maintenance
3. Create page objects for new pages
4. Add domain-specific helpers as needed
5. Share patterns across the team

## Example Migration

See `templates/standard-test-template.spec.ts` for a complete example of the new patterns.

## Questions?

- Review the helper classes for available methods
- Check existing page objects for examples
- Use the template as a starting point
- Add new utilities to the shared helpers as needed