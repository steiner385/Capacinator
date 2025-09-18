# E2E Test Migration Guide

This guide helps you migrate existing e2e tests to the new standardized framework.

## Overview of Changes

### ✅ What's New
- Unified test fixtures in `tests/e2e/fixtures/index.ts`
- Single Playwright configuration in `playwright.config.ts`
- Standardized authentication via `authenticatedPage` fixture
- Global setup/teardown for test data
- Consistent test patterns and helpers

### ❌ What's Deprecated
- Multiple playwright config files (use only `playwright.config.ts`)
- Custom profile selection implementations
- Direct localStorage manipulation for auth
- Inconsistent port usage (standardize on 3120)

## Migration Steps

### 1. Update Test Imports

**Before:**
```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
```

**After:**
```typescript
import { test, expect, TestHelpers } from '../fixtures';
```

### 2. Remove Manual Setup

**Before:**
```typescript
test.beforeEach(async ({ page }) => {
  const helpers = new TestHelpers(page);
  await page.goto('/');
  await helpers.setupPage();
});
```

**After:**
```typescript
// No manual setup needed - use authenticatedPage fixture
test('my test', async ({ authenticatedPage, testHelpers }) => {
  // Already authenticated and ready to use
});
```

### 3. Update Navigation

**Before:**
```typescript
await page.goto('http://localhost:3121/projects');
await handleProfileSelection(); // Custom implementation
```

**After:**
```typescript
await testHelpers.navigateTo('/projects');
// Profile selection handled automatically
```

### 4. Use Standard Patterns

**Before:**
```typescript
test('should create a new project', async ({ page }) => {
  // Custom implementation
});
```

**After:**
```typescript
import { tags, patterns } from '../fixtures';

test(`${tags.crud} ${patterns.crud('project').create}`, async ({ authenticatedPage, testHelpers }) => {
  // Standardized implementation
});
```

### 5. API Testing

**Before:**
```typescript
const response = await page.request.post('http://localhost:3120/api/projects', {
  data: projectData
});
```

**After:**
```typescript
test('api test', async ({ apiContext, testData }) => {
  const project = testData.generateProject();
  const response = await apiContext.post('/api/projects', {
    data: project
  });
});
```

## Common Patterns

### CRUD Tests
```typescript
test.describe('Projects CRUD', () => {
  test(`${tags.crud} create project`, async ({ authenticatedPage, testHelpers }) => {
    await testHelpers.navigateTo('/projects');
    await authenticatedPage.getByRole('button', { name: /add/i }).click();
    // ... rest of test
  });
});
```

### Navigation Tests
```typescript
test(`${tags.smoke} navigate to reports`, async ({ authenticatedPage, testHelpers }) => {
  await testHelpers.navigateViaSidebar('Reports');
  await expect(authenticatedPage).toHaveURL(/.*\/reports/);
});
```

### Data Table Tests
```typescript
test('should display people table', async ({ authenticatedPage, testHelpers }) => {
  await testHelpers.navigateTo('/people');
  await testHelpers.waitForDataTable();
  await expect(authenticatedPage.locator('table')).toBeVisible();
});
```

## Test Organization

Move tests to appropriate directories:
- `tests/e2e/suites/core/` - Navigation, auth, basic UI
- `tests/e2e/suites/crud/` - CRUD operations
- `tests/e2e/suites/reports/` - Reporting features
- `tests/e2e/suites/scenarios/` - Complex workflows
- `tests/e2e/smoke/` - Quick smoke tests

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run smoke tests only
npx playwright test --project=smoke

# Run specific suite
npx playwright test tests/e2e/suites/crud

# Run tests with specific tag
npx playwright test --grep @crud
```

## Checklist for Migration

- [ ] Update imports to use unified fixtures
- [ ] Remove custom authentication/profile selection
- [ ] Standardize on port 3120
- [ ] Use `authenticatedPage` fixture instead of manual setup
- [ ] Use `testHelpers.navigateTo()` for navigation
- [ ] Add appropriate test tags (@smoke, @crud, etc.)
- [ ] Move test to appropriate directory
- [ ] Remove duplicate test if consolidating
- [ ] Verify test passes with new framework