# Phase 4.9: Fix Hardcoded UUID Tests

## Overview
This phase addresses tests in the root directory that use hardcoded UUIDs for authentication, specifically the UUID `123e4567-e89b-12d3-a456-426614174000` which appears to represent "Alice Johnson" in test data.

## Affected Files
The following files use the `loginAsUser` function with hardcoded UUIDs:

### Active Test Files:
1. `phase-duplication.spec.ts` - Phase duplication UI tests
2. `api-security-validation.spec.ts` - API security tests
3. `business-rule-validation.spec.ts` - Business rule tests
4. `security-vulnerability-testing.spec.ts` - Security vulnerability tests
5. `performance-load-testing.spec.ts` - Performance/load tests
6. `authentication-security.spec.ts` - Authentication security tests
7. `database-transaction-safety.spec.ts` - Database transaction safety tests

### Other Files Using Hardcoded UUID:
8. `api-corruption-prevention.spec.ts` - Uses direct person select with UUID
9. `circular-json-fix-validation.spec.ts` - May have UUID references

## Migration Strategy

### Option 1: Update to Use Test Fixtures (Recommended)
- Migrate these tests to use the standardized test fixtures
- The `authenticatedPage` fixture handles profile selection automatically
- No hardcoded UUIDs needed

### Option 2: Create Dynamic Test User
- If tests need specific user context, create test users dynamically
- Use TestDataHelpers to create users with known permissions
- Reference created users by their dynamic IDs

### Option 3: Minimal Fix
- Replace hardcoded UUID with dynamic profile selection
- Update `loginAsUser` to select first available profile
- This maintains test structure while removing hardcoded data

## Implementation Plan

### Step 1: Categorize Tests by Type
- **Security/API Tests**: May need specific user permissions
- **UI Feature Tests**: Can use standard authenticated fixture
- **Performance Tests**: May need bulk test data

### Step 2: Migrate UI Tests First
Files like `phase-duplication.spec.ts` can be migrated to:
- Use standard test fixtures
- Move to appropriate suite directory (e.g., `suites/features/phases/`)
- Remove custom login function

### Step 3: Update Security Tests
Security-focused tests may need:
- Dynamic creation of users with specific roles
- Test-specific authentication contexts
- Proper cleanup after tests

### Step 4: Handle Special Cases
Performance tests might need:
- Bulk user creation
- Specific data scenarios
- Custom authentication flows

## Example Migration

### Before (with hardcoded UUID):
```typescript
async function loginAsUser(page: any, personId: string = '123e4567-e89b-12d3-a456-426614174000') {
  await page.goto('/');
  const loginSelect = page.locator('#person-select');
  await loginSelect.selectOption(personId);
  await page.click('.login-button');
}

test('some test', async ({ page }) => {
  await loginAsUser(page);
  // test logic
});
```

### After (using fixtures):
```typescript
import { test, expect } from '../../fixtures';

test('some test', async ({ authenticatedPage, testHelpers }) => {
  // Already authenticated, proceed with test
  await testHelpers.navigateTo('/some-page');
  // test logic
});
```

## Benefits of Migration
1. **No Hardcoded Data**: Tests won't break if seed data changes
2. **Better Isolation**: Each test gets its own test data
3. **Consistent Patterns**: All tests use same authentication approach
4. **Easier Maintenance**: Single place to update authentication logic
5. **Parallel Execution**: Tests can run in parallel without conflicts

## Priority Order
1. **High Priority**: UI tests that can easily use standard fixtures
2. **Medium Priority**: API/Integration tests that may need custom setup
3. **Low Priority**: Performance/stress tests with specific requirements

## Next Steps
1. Start with `phase-duplication.spec.ts` as a pilot migration
2. Create template for migrating security tests
3. Document any special authentication requirements
4. Update remaining tests incrementally