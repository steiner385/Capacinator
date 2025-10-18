# Test Stabilization Guide

**Status**: 🔴 BLOCKER - 85 tests failing, preventing coverage improvement
**Updated**: 2025-10-17
**Priority**: Critical - Must be resolved before continuing Phase 2 of TEST_COVERAGE_PLAN.md

---

## Table of Contents
1. [Current State & Blockers](#current-state--blockers)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Solution Patterns](#solution-patterns)
4. [Step-by-Step Fix Instructions](#step-by-step-fix-instructions)
5. [Verification Checklist](#verification-checklist)

---

## Current State & Blockers

### Test Suite Health
```
Tests:       139 passed, 85 failed, 143 skipped, 367 total
Coverage:    46.33% (target: 80%)
Status:      BLOCKED - Cannot add new coverage until tests stabilize
```

### Failing Tests Breakdown

#### Server-Side Controller Tests (47 failures)
- **AssignmentsController.test.ts**: 26 failures
- **PeopleController.test.ts**: 21+ failures

#### Client-Side Component Tests (12+ failures)
- **Scenarios.test.tsx**: Multiple selector ambiguity issues
- **PersonDetails.test.tsx**: Selector ambiguity issues
- **ProjectTypeDetails.test.tsx**: Selector ambiguity issues

### Skipped Tests (143)
- Tests explicitly marked with `.skip` or `xit`
- These are intentionally skipped and can be addressed later
- Not blocking current stabilization work

---

## Root Cause Analysis

### Problem 1: Database Mock Not Properly Configured for Knex

**Impact**: 47 controller tests failing

**Root Cause**: Knex query builders have a unique pattern that makes them difficult to mock. They are both:
1. **Chainable**: Methods return the query builder for chaining
   ```typescript
   db('table').where('id', 1).join('other').select('*')
   ```
2. **Thenable**: When awaited, JavaScript calls their `.then()` method
   ```typescript
   const results = await db('table').where('id', 1);  // Uses .then() internally
   ```

**Why Existing Mocks Failed**:
```typescript
// ❌ This doesn't work:
const mockDb = jest.fn();
mockDb.mockResolvedValue([{ id: 1 }]);

// Because controllers do:
await this.db('assignments').where('id', 1);  // mockDb() returns undefined
```

The mock needs to:
- Return itself for method chaining
- Have a `.then()` method that returns a Promise
- Support configuration of return values per test
- Support all Knex query builder methods (where, join, select, etc.)

### Problem 2: Client Test Selector Ambiguity

**Impact**: 12+ client tests failing

**Root Cause**: Multiple elements on page with the same text content, causing selector ambiguity.

**Example**:
```typescript
// ❌ This fails when multiple "Delete" buttons exist:
fireEvent.click(screen.getByText('Delete'));

// ✅ Should use more specific selectors:
fireEvent.click(screen.getByRole('button', { name: 'Delete Scenario X' }));
```

---

## Solution Patterns

### Pattern 1: Chainable Thenable Database Mock

This is the core solution for all controller tests. Create a mock that supports both chaining and awaiting.

#### Complete Implementation

```typescript
/**
 * Creates a mock database object that mimics Knex query builder behavior.
 * The mock is both chainable (methods return self) and thenable (can be awaited).
 *
 * Usage in tests:
 * ```typescript
 * const mockDb = createChainableMock();
 * mockDb._setQueryResult([{ id: 1, name: 'Test' }]);
 * mockDb._setCountResult(1);
 *
 * // Now queries will return the configured data:
 * const results = await mockDb('table').where('id', 1);  // Returns [{ id: 1, name: 'Test' }]
 * ```
 */
const createChainableMock = () => {
  // Storage for mock data that tests can configure
  let queryResult: any[] = [];
  let firstResult: any = null;
  let countResult = { count: 0 };
  let insertResult: any[] = [];
  let updateResult: any[] = [];
  let deleteResult = 0;

  // Main mock function - calling it returns itself for chaining
  const mock: any = jest.fn(() => mock);

  // Query building methods (all return self for chaining)
  mock.where = jest.fn().mockReturnValue(mock);
  mock.andWhere = jest.fn().mockReturnValue(mock);
  mock.orWhere = jest.fn().mockReturnValue(mock);
  mock.whereIn = jest.fn().mockReturnValue(mock);
  mock.whereNull = jest.fn().mockReturnValue(mock);
  mock.whereNotNull = jest.fn().mockReturnValue(mock);
  mock.join = jest.fn().mockReturnValue(mock);
  mock.leftJoin = jest.fn().mockReturnValue(mock);
  mock.rightJoin = jest.fn().mockReturnValue(mock);
  mock.innerJoin = jest.fn().mockReturnValue(mock);
  mock.select = jest.fn().mockReturnValue(mock);
  mock.orderBy = jest.fn().mockReturnValue(mock);
  mock.groupBy = jest.fn().mockReturnValue(mock);
  mock.limit = jest.fn().mockReturnValue(mock);
  mock.offset = jest.fn().mockReturnValue(mock);
  mock.sum = jest.fn().mockReturnValue(mock);
  mock.avg = jest.fn().mockReturnValue(mock);
  mock.min = jest.fn().mockReturnValue(mock);
  mock.max = jest.fn().mockReturnValue(mock);
  mock.returning = jest.fn().mockReturnValue(mock);

  // Make the mock thenable (so it can be awaited)
  // This is what allows: await db('table').where(...)
  mock.then = jest.fn((resolve) => Promise.resolve(queryResult).then(resolve));
  mock.catch = jest.fn((reject) => Promise.resolve(queryResult).catch(reject));

  // Terminal query methods (these execute the query)

  mock.first = jest.fn().mockImplementation(() => {
    return {
      then: (resolve: any) => Promise.resolve(firstResult).then(resolve),
      catch: (reject: any) => Promise.resolve(firstResult).catch(reject)
    };
  });

  mock.insert = jest.fn().mockImplementation((data) => {
    return {
      then: (resolve: any) => Promise.resolve(insertResult).then(resolve),
      catch: (reject: any) => Promise.resolve(insertResult).catch(reject),
      returning: jest.fn().mockImplementation(() => {
        return {
          then: (resolve: any) => Promise.resolve(insertResult).then(resolve),
          catch: (reject: any) => Promise.resolve(insertResult).catch(reject)
        };
      })
    };
  });

  mock.update = jest.fn().mockImplementation((data) => {
    return {
      then: (resolve: any) => Promise.resolve(updateResult).then(resolve),
      catch: (reject: any) => Promise.resolve(updateResult).catch(reject),
      returning: jest.fn().mockImplementation(() => {
        return {
          then: (resolve: any) => Promise.resolve(updateResult).then(resolve),
          catch: (reject: any) => Promise.resolve(updateResult).catch(reject)
        };
      })
    };
  });

  mock.del = jest.fn().mockImplementation(() => {
    return {
      then: (resolve: any) => Promise.resolve(deleteResult).then(resolve),
      catch: (reject: any) => Promise.resolve(deleteResult).catch(reject)
    };
  });

  mock.delete = mock.del; // Knex supports both .del() and .delete()

  mock.count = jest.fn().mockImplementation(() => {
    const countMock: any = {
      then: (resolve: any) => Promise.resolve([countResult]).then(resolve),
      catch: (reject: any) => Promise.resolve([countResult]).catch(reject),
      first: jest.fn().mockImplementation(() => {
        return {
          then: (resolve: any) => Promise.resolve(countResult).then(resolve),
          catch: (reject: any) => Promise.resolve(countResult).catch(reject)
        };
      })
    };
    return countMock;
  });

  mock.raw = jest.fn();

  // Helper methods for tests to configure what data the mock returns
  mock._setQueryResult = (data: any[]) => { queryResult = data; };
  mock._setFirstResult = (data: any) => { firstResult = data; };
  mock._setCountResult = (count: number) => { countResult = { count }; };
  mock._setInsertResult = (data: any[]) => { insertResult = data; };
  mock._setUpdateResult = (data: any[]) => { updateResult = data; };
  mock._setDeleteResult = (count: number) => { deleteResult = count; };

  return mock;
};
```

#### Usage Example in Test

```typescript
describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let mockDb: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AssignmentsController();

    // Create the mock database
    mockDb = createChainableMock();
    (controller as any).db = mockDb;

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      logger: mockLogger
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('returns paginated list of assignments', async () => {
    const mockAssignments = [
      {
        id: 'assign-1',
        project_id: 'proj-1',
        person_id: 'person-1',
        role_id: 'role-1',
        allocation_percentage: 50,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        computed_start_date: '2025-01-01',
        computed_end_date: '2025-12-31',
        project_name: 'Project Alpha',
        person_name: 'John Doe',
        role_name: 'Developer',
        aspiration_start: '2025-01-01',
        aspiration_finish: '2025-12-31',
        assignment_date_mode: 'fixed'
      }
    ];

    // Configure the mock to return our test data
    mockDb._setQueryResult(mockAssignments);
    mockDb._setCountResult(1);

    // Call the controller method
    await controller.getAll(mockReq, mockRes);

    // Verify the response
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockAssignments,
        pagination: expect.objectContaining({
          total: 1
        })
      })
    );
  });
});
```

### Pattern 2: Specific Client Selectors

For client tests with selector ambiguity, use more specific queries.

#### Problem: Ambiguous Text Selection
```typescript
// ❌ Fails when multiple elements have "Delete" text
fireEvent.click(screen.getByText('Delete'));
```

#### Solution 1: Use getByRole with name
```typescript
// ✅ Specific button by accessible name
fireEvent.click(screen.getByRole('button', { name: 'Delete Scenario X' }));
```

#### Solution 2: Use getByTestId
```typescript
// In component:
<button data-testid="delete-scenario-x">Delete</button>

// In test:
fireEvent.click(screen.getByTestId('delete-scenario-x'));
```

#### Solution 3: Use getAllByText and index
```typescript
// ✅ Get all buttons and select specific one
const deleteButtons = screen.getAllByText('Delete');
fireEvent.click(deleteButtons[0]); // First delete button
```

#### Solution 4: Query within a container
```typescript
// Get the specific container first
const scenarioCard = screen.getByText('Scenario X').closest('.scenario-card');

// Then query within that container
const deleteButton = within(scenarioCard).getByText('Delete');
fireEvent.click(deleteButton);
```

---

## Step-by-Step Fix Instructions

### Phase 1: Extract Reusable Mock Helper

**Goal**: Create a shared helper file that all controller tests can use.

**File**: `src/server/api/controllers/__tests__/helpers/mockDb.ts`

```typescript
/**
 * Mock database helper for testing controllers that use Knex.
 *
 * This creates a mock that mimics Knex query builder behavior:
 * - Chainable: methods return the builder for chaining
 * - Thenable: can be awaited like a real query
 * - Configurable: tests can set what data to return
 *
 * @example
 * ```typescript
 * const mockDb = createMockDb();
 * mockDb._setQueryResult([{ id: 1, name: 'Test' }]);
 *
 * // Controller uses it:
 * const results = await this.db('table').where('id', 1);
 * // Returns: [{ id: 1, name: 'Test' }]
 * ```
 */
export function createMockDb() {
  // [Copy the createChainableMock() implementation from Pattern 1 above]
}

export type MockDb = ReturnType<typeof createMockDb>;
```

**Instructions**:
1. Create the directory if it doesn't exist:
   ```bash
   mkdir -p src/server/api/controllers/__tests__/helpers
   ```

2. Create the file `mockDb.ts` with the complete implementation from Pattern 1

3. Add TypeScript types and JSDoc comments for IDE support

### Phase 2: Fix AssignmentsController.test.ts (26 tests)

**File**: `src/server/api/controllers/__tests__/AssignmentsController.test.ts`

**Instructions**:

1. Import the helper at the top:
   ```typescript
   import { createMockDb } from './helpers/mockDb';
   ```

2. Update the `beforeEach` hook (already partially done):
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
     controller = new AssignmentsController();

     mockDb = createMockDb();
     (controller as any).db = mockDb;

     // ... rest of setup
   });
   ```

3. For each failing test, add mock configuration before calling the controller:
   ```typescript
   it('test name', async () => {
     // Set up mock data
     mockDb._setQueryResult([/* expected data */]);
     mockDb._setCountResult(/* expected count */);

     // Call controller
     await controller.method(mockReq, mockRes);

     // Assert results
     expect(mockRes.json).toHaveBeenCalledWith(/* expected response */);
   });
   ```

4. Ensure all mock data includes required fields:
   - `computed_start_date`
   - `computed_end_date`
   - `aspiration_start`
   - `aspiration_finish`
   - `assignment_date_mode`

5. Run tests to verify:
   ```bash
   npm test -- AssignmentsController.test.ts
   ```

### Phase 3: Fix PeopleController.test.ts (21+ tests)

**File**: `src/server/api/controllers/__tests__/PeopleController.test.ts`

**Instructions**:

1. Import the helper:
   ```typescript
   import { createMockDb } from './helpers/mockDb';
   ```

2. Update `beforeEach` to use the mock:
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
     controller = new PeopleController();

     mockDb = createMockDb();
     (controller as any).db = mockDb;

     // ... rest of setup
   });
   ```

3. Apply the same pattern as AssignmentsController for each test

4. Run tests to verify:
   ```bash
   npm test -- PeopleController.test.ts
   ```

### Phase 4: Fix Client-Side Selector Issues (3 files)

#### File 1: `tests/unit/client/Scenarios.test.tsx`

**Common Issues**:
- Multiple "Delete" buttons causing ambiguity
- Multiple "Edit" buttons causing ambiguity

**Fix Strategy**:
1. Read the test file to identify specific failures
2. For each failure, determine which element the test intends to interact with
3. Apply Pattern 2 (Specific Client Selectors) to make the query unambiguous

**Example Fix**:
```typescript
// Before:
fireEvent.click(screen.getByText('Delete'));

// After - identify which scenario by its name first:
const scenarioCard = screen.getByText('Test Scenario').closest('[role="listitem"]');
const deleteButton = within(scenarioCard).getByRole('button', { name: /delete/i });
fireEvent.click(deleteButton);
```

**Run tests**:
```bash
npm test -- Scenarios.test.tsx
```

#### File 2: `client/src/pages/__tests__/PersonDetails.test.tsx`

**Apply same strategy as Scenarios.test.tsx**

**Run tests**:
```bash
npm test -- PersonDetails.test.tsx
```

#### File 3: `client/src/pages/__tests__/ProjectTypeDetails.test.tsx`

**Apply same strategy as Scenarios.test.tsx**

**Run tests**:
```bash
npm test -- ProjectTypeDetails.test.tsx
```

---

## Verification Checklist

### Step 1: Create Mock Helper
- [ ] Created `src/server/api/controllers/__tests__/helpers/mockDb.ts`
- [ ] Implemented `createMockDb()` function with all Knex methods
- [ ] Added TypeScript types and JSDoc comments
- [ ] Verified file compiles without errors

### Step 2: Fix Controller Tests
- [ ] Fixed AssignmentsController.test.ts (26 tests)
  ```bash
  npm test -- AssignmentsController.test.ts
  # Should show: 26 passed
  ```
- [ ] Fixed PeopleController.test.ts (21+ tests)
  ```bash
  npm test -- PeopleController.test.ts
  # Should show: 21+ passed
  ```
- [ ] All server controller tests passing:
  ```bash
  npm test -- src/server/api/controllers/__tests__/
  # Should show: 0 failed
  ```

### Step 3: Fix Client Tests
- [ ] Fixed Scenarios.test.tsx
  ```bash
  npm test -- Scenarios.test.tsx
  # Should show: 0 failed
  ```
- [ ] Fixed PersonDetails.test.tsx
  ```bash
  npm test -- PersonDetails.test.tsx
  # Should show: 0 failed
  ```
- [ ] Fixed ProjectTypeDetails.test.tsx
  ```bash
  npm test -- ProjectTypeDetails.test.tsx
  # Should show: 0 failed
  ```

### Step 4: Full Test Suite Verification
- [ ] Run complete test suite:
  ```bash
  npm test
  ```
- [ ] Verify results:
  - Expected: `Tests: 224+ passed, 0 failed, 143 skipped`
  - All previously failing tests now passing
  - No new failures introduced
  - Skipped tests remain skipped (will address later)

### Step 5: Generate Coverage Report
- [ ] Run coverage:
  ```bash
  npm run test:coverage
  ```
- [ ] Verify coverage baseline maintained:
  - Coverage should still be ~46.33%
  - No significant drops in coverage
  - Coverage report generates successfully

### Step 6: Update Documentation
- [ ] Update TEST_COVERAGE_PLAN.md:
  - Remove blocker notice
  - Update Phase 2 status to "Ready to Begin"
  - Add note about stabilization completion
- [ ] Commit the changes:
  ```bash
  git add .
  git commit -m "fix: stabilize test suite - fix 85 failing tests

  - Create reusable mockDb helper for controller tests
  - Fix AssignmentsController tests (26 tests)
  - Fix PeopleController tests (21+ tests)
  - Fix client selector ambiguity issues (3 files)
  - All tests now passing (224+), ready for coverage work

  🤖 Generated with Claude Code"
  ```

---

## Success Criteria

✅ Test suite is considered **stabilized** when:
1. Zero failing tests (only passing and skipped tests)
2. All 85 previously failing tests now passing
3. No new test failures introduced
4. Coverage baseline maintained at ~46.33%
5. Test suite completes in reasonable time (<5 minutes)
6. Documentation updated to reflect stabilization

Once stabilized, you can proceed with Phase 2 of TEST_COVERAGE_PLAN.md to improve coverage from 46.33% to 80%.

---

## Additional Resources

- **TEST_COVERAGE_PLAN.md**: Overall strategy for reaching 80% coverage
- **TEST_PATTERNS_QUICKREF.md**: Quick reference for common test patterns
- **mockDb.ts**: Reusable database mock helper (to be created)
- **Knex Documentation**: https://knexjs.org/
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
