# Scenario E2E Test Improvements - Systematic Approach

## Overview
This document outlines the systematic improvements made to the scenario E2E tests to address reliability, synchronization, and maintenance issues.

## Key Problems Addressed

1. **Test Data Synchronization**: Tests were creating data that wasn't immediately visible in the UI
2. **Test Isolation**: Multiple test runs were interfering with each other
3. **Flaky Selectors**: UI selectors were too specific and brittle
4. **Timing Issues**: Race conditions between API calls and UI updates
5. **User ID Dependencies**: Tests failing due to missing user context

## Systematic Solutions Implemented

### 1. Test Utilities Module (`scenario-test-utils.ts`)

Created a comprehensive utility module with:

- **Polling Mechanism**: `waitForScenariosToLoad()` polls the UI until scenarios appear
- **Retry Logic**: `getScenarioRow()` retries finding elements with configurable attempts
- **API Verification**: `verifyScenariosViaAPI()` confirms data exists before UI checks
- **Flexible Selectors**: Multiple fallback strategies for finding UI elements
- **Cleanup Utilities**: Consistent cleanup of test data by prefix

### 2. Test Isolation Strategy

- **Unique Prefixes**: `createUniqueTestPrefix()` generates timestamp-based prefixes
- **Isolated Test Contexts**: Each test run uses unique identifiers
- **Comprehensive Cleanup**: Removes all test-created data after each test

### 3. Synchronization Improvements

- **Wait for Sync**: `waitForSync()` ensures API and UI are in sync
- **Network Idle**: Waits for all network requests to complete
- **Force Refresh**: Refreshes page when data isn't immediately visible
- **API Polling**: Verifies data exists via API before checking UI

### 4. Robust Selectors

- **Multiple Strategies**: Tries various selector approaches
- **Badge Detection**: Flexible matching for status/type badges
- **Action Buttons**: Multiple ways to find edit/delete/branch buttons
- **Text Matching**: Case-insensitive and partial text matching

### 5. Error Handling

- **User ID Fallbacks**: Multiple strategies to obtain valid user ID
- **Detailed Logging**: Console output for debugging failures
- **Graceful Degradation**: Tests continue with fallback strategies
- **Clear Error Messages**: Specific errors for each failure type

## Updated Test Structure

```typescript
test.beforeEach(async ({ page, apiContext, testHelpers }) => {
  // 1. Create unique test context
  testPrefix = createUniqueTestPrefix('scnfix');
  
  // 2. Initialize utilities
  utils = new ScenarioTestUtils({ page, apiContext, testPrefix });
  
  // 3. Navigate and wait for page
  await testHelpers.navigateTo('/scenarios');
  await testHelpers.waitForPageContent();
  
  // 4. Get/create user with fallbacks
  userId = await getUserIdWithFallbacks(apiContext);
  
  // 5. Create test data via API
  testScenarios = await createTestScenarios(utils, userId);
  
  // 6. Sync UI with data
  await page.reload();
  await waitForSync(page);
});
```

## Best Practices Applied

1. **API-First Testing**: Create data via API, verify in UI
2. **Explicit Waits**: No arbitrary timeouts, wait for specific conditions
3. **Idempotent Tests**: Each test can run independently
4. **Comprehensive Cleanup**: No test data pollution
5. **Flexible Assertions**: Handle UI variations gracefully

## Test Reliability Metrics

Before improvements:
- Pass rate: ~20%
- Flakiness: High
- Debug difficulty: High

After improvements:
- Expected pass rate: >90%
- Flakiness: Low
- Debug difficulty: Low (detailed logging)

## Usage Example

```typescript
// Use the improved test structure
test('should display scenarios', async ({ page }) => {
  // Wait for scenarios with retry and polling
  const rowCount = await utils.waitForScenariosToLoad(testScenarios.length);
  
  // Verify each scenario with flexible selectors
  for (const scenario of testScenarios) {
    const row = await utils.getScenarioRow(scenario.name);
    await expect(row).toBeVisible();
    
    // Use robust badge detection
    const typeBadge = utils.getBadge(row, 'type');
    await expect(typeBadge).toHaveText(scenario.scenario_type.toUpperCase());
  }
});
```

## Maintenance Guidelines

1. **Always use utilities**: Don't create custom selectors in tests
2. **Create unique prefixes**: Ensure test isolation
3. **Verify via API first**: Confirm data exists before UI checks
4. **Add logging**: Help future debugging
5. **Clean up thoroughly**: Leave no test data behind

## Future Improvements

1. **Parallel Test Support**: Ensure tests can run in parallel
2. **Visual Regression**: Add screenshot comparisons
3. **Performance Metrics**: Track test execution time
4. **Error Recovery**: Automatic retry on transient failures
5. **Test Data Factory**: More sophisticated test data generation