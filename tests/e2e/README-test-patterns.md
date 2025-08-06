# E2E Test Patterns and Best Practices

## Quick Start

For new E2E tests, use the improved test helpers:

```typescript
import { test, expect } from './helpers/base-test';
import { testConfig, waitForPageReady } from './helpers/test-config';

test('your test name', async ({ authenticatedPage }) => {
  const page = authenticatedPage; // Already logged in!
  
  // Your test logic here
  await page.goto('/your-page');
  await waitForPageReady(page);
});
```

## Test Helpers Available

### 1. Authentication Helper (`auth-helper.ts`)
- `AuthHelper` class handles profile selection automatically
- `quickLogin()` - Logs in if needed
- `loginAndNavigateTo(path)` - Login and go to specific page
- `isLoggedIn()` - Check authentication status
- `ensureLoggedIn()` - Ensure user is logged in

### 2. Base Test (`base-test.ts`)
- `authenticatedPage` fixture - Pre-authenticated page ready to use
- `authHelper` fixture - Auth helper instance
- `waitForPageContent()` - Wait for page layout to load

### 3. Test Config (`test-config.ts`)
- Common selectors, timeouts, and API endpoints
- `waitForPageReady()` - Wait for page to be fully loaded
- `waitForApiCall()` - Wait for specific API call to complete
- `elementExists()` - Check if element exists without throwing

## Best Practices

### 1. Use Pre-authenticated Pages
```typescript
// ❌ Don't do this
test('my test', async ({ page }) => {
  await loginAsUser(page); // Slow!
  // ... test logic
});

// ✅ Do this instead
test('my test', async ({ authenticatedPage }) => {
  const page = authenticatedPage; // Already logged in!
  // ... test logic
});
```

### 2. Use Configured Timeouts
```typescript
// ❌ Don't hardcode timeouts
await page.waitForSelector('.modal', { timeout: 30000 });

// ✅ Use configured timeouts
await page.waitForSelector('.modal', { 
  timeout: testConfig.timeouts.elementVisible 
});
```

### 3. Wait for Page Ready State
```typescript
// ❌ Don't just wait for navigation
await page.goto('/projects');

// ✅ Wait for page to be ready
await page.goto('/projects');
await waitForPageReady(page);
```

### 4. Use Semantic Selectors
```typescript
// ❌ Avoid brittle selectors
await page.click('.btn-sm.btn-primary');

// ✅ Use semantic selectors
await page.getByRole('button', { name: /add phase/i }).click();
```

## Common Patterns

### Navigate and Interact
```typescript
test('navigate to project', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  
  // Navigate
  await page.goto('/projects');
  await waitForPageReady(page);
  
  // Wait for data
  await waitForApiCall(page, testConfig.api.projects);
  
  // Interact
  const firstProject = page.locator('table tbody tr').first();
  await firstProject.getByRole('button', { name: 'View Details' }).click();
});
```

### Handle Modals
```typescript
test('modal interaction', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  
  // Open modal
  await page.getByRole('button', { name: 'Add' }).click();
  
  // Wait for modal
  await page.waitForSelector(testConfig.selectors.modalOverlay, {
    state: 'visible'
  });
  
  // Interact with modal
  await page.fill('input[name="name"]', 'Test Name');
  
  // Close modal
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForSelector(testConfig.selectors.modalOverlay, {
    state: 'hidden'
  });
});
```

### Form Submission
```typescript
test('form submission', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  
  // Fill form
  await page.fill('input[name="name"]', 'Test Name');
  await page.selectOption('select[name="type"]', 'option-value');
  
  // Submit and wait for response
  const responsePromise = waitForApiCall(page, '/api/submit');
  await page.getByRole('button', { name: 'Submit' }).click();
  const response = await responsePromise;
  
  // Verify success
  expect(response.status()).toBe(200);
});
```

## Debugging Tips

1. **Use headed mode**: `npx playwright test --headed`
2. **Add console logs**: Tests will show console output
3. **Take screenshots**: `await page.screenshot({ path: 'debug.png' })`
4. **Use page.pause()**: Pause execution to inspect state
5. **Check traces**: `npx playwright show-trace trace.zip`

## Environment Differences

- **Dev Environment**: Port 3120 (use `npm run test:e2e`)
- **E2E Environment**: Port 3121 (use `npm run test:e2e:isolated`)

Most tests should work in dev environment. Only use E2E environment for tests that need isolation or test data generation.