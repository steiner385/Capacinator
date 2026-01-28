# Research: Git Sync Unit Tests - Tier 2 Validation & Safety

**Feature Branch**: `003-git-sync-tier2-tests`
**Date**: 2026-01-25
**Spec**: [spec.md](./spec.md)

## Research Objectives

This research phase resolves unknowns for implementing 210 unit tests for Tier 2 (Validation & Safety) services.

---

## 1. Knex Database Mocking Patterns

### Decision
Use inline mock functions with Jest's `jest.fn()` for Knex query builder chains, following the pattern established in Tier 1 tests.

### Rationale
- Tier 1 tests (GitConflictResolver, ScenarioExporter) use simple object mocking without external libraries
- Knex's chainable API can be mocked by returning the mock object itself from chained methods
- This approach is lightweight and explicit about what's being tested

### Pattern for ConflictValidator Tests

```typescript
const createMockDb = (overrides: Partial<{
  assignments: any[];
  people: any[];
  projects: any[];
  phases: any[];
}> = {}) => {
  const mockDb = jest.fn().mockImplementation((table: string) => {
    const chain = {
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereBetween: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      first: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
    };

    // Configure return values based on table
    switch (table) {
      case 'project_assignments':
        chain.first.mockResolvedValue(overrides.assignments?.[0]);
        break;
      // ... configure other tables
    }

    return chain;
  });

  return mockDb as unknown as Knex;
};
```

### Alternatives Considered
- **knex-mock-client**: External library, adds dependency
- **Full in-memory SQLite**: Slower, more complex setup, better suited for integration tests

---

## 2. HTTP/HTTPS Mocking for GitHealthCheck

### Decision
Mock Node.js `http` and `https` modules using Jest's module mocking to simulate network responses for health checks.

### Rationale
- GitHealthCheck uses native `http.get` and `https.get`
- Jest can mock these modules at the module level
- No external HTTP testing libraries needed

### Pattern for Network Connectivity Tests

```typescript
// Mock at top of file
jest.mock('https', () => ({
  get: jest.fn(),
}));
jest.mock('http', () => ({
  get: jest.fn(),
}));

import https from 'https';
import http from 'http';

// In test
const mockReq = {
  on: jest.fn((event, callback) => {
    if (event === 'error') mockReq.errorCallback = callback;
    if (event === 'timeout') mockReq.timeoutCallback = callback;
    return mockReq;
  }),
  destroy: jest.fn(),
  end: jest.fn(),
};

(https.get as jest.Mock).mockImplementation((_options, callback) => {
  const mockRes = {
    statusCode: 200,
    resume: jest.fn(),
  };
  setTimeout(() => callback(mockRes), 10);
  return mockReq;
});
```

### Test Scenarios
1. **Reachable (2xx, 3xx, 4xx)**: Mock response with appropriate statusCode
2. **Server error (5xx)**: Mock response with statusCode >= 500
3. **Timeout**: Trigger timeout callback after configuring short timeout
4. **Network error**: Trigger error callback with ENOTFOUND, ECONNREFUSED

### Alternatives Considered
- **nock**: External library, overkill for simple http.get mocking
- **msw**: Better for integration tests with actual HTTP stack

---

## 3. File System Mocking for Disk Space Checks

### Decision
Mock `fs/promises` module to control `statfs` and `access` return values.

### Rationale
- GitHealthCheck uses `fs.statfs()` (Node 18.15+) for disk space calculation
- Direct fs mocking allows precise control over returned statistics

### Pattern for Disk Space Tests

```typescript
jest.mock('fs/promises', () => ({
  statfs: jest.fn(),
  access: jest.fn(),
}));

import fs from 'fs/promises';

// Test sufficient space (500MB free)
(fs.statfs as jest.Mock).mockResolvedValue({
  bsize: 4096,           // block size in bytes
  bavail: 128000,        // available blocks (128000 * 4096 = ~500MB)
});

// Test insufficient space (100MB free)
(fs.statfs as jest.Mock).mockResolvedValue({
  bsize: 4096,
  bavail: 25600,         // 25600 * 4096 = ~100MB
});

// Test directory not existing (falls back to parent)
(fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
```

### Test Scenarios
1. **Directory exists with sufficient space**: access passes, statfs returns adequate bavail
2. **Directory exists with insufficient space**: access passes, statfs returns low bavail
3. **Directory doesn't exist**: access rejects, check parent directory
4. **Parent directory also missing**: Propagate error

---

## 4. Error Categorization Test Coverage

### Decision
Create comprehensive test matrix covering all error patterns in `categorizeGitError()`.

### Rationale
- GitErrors.ts has 10 error categories with specific message patterns
- 100% coverage requires testing each pattern and boundary cases

### Error Category Test Matrix

| Category | Test Patterns | Expected Error Class |
|----------|--------------|---------------------|
| Network | `enotfound`, `econnrefused`, `etimedout`, `getaddrinfo`, `could not resolve host` | GitNetworkError |
| Auth | `authentication failed`, `invalid credentials`, `could not read username`, `401`, `403 forbidden`, `bad credentials` | GitAuthenticationError |
| Permission | `permission denied`, `insufficient permission`, `protected branch`, `you are not allowed` | GitPermissionError |
| Conflict | `conflict` | GitConflictError |
| Branch | `branch` + `already exists`, `not found`, `does not exist` | GitBranchError |
| Push | `push`, `non-fast-forward`, `rejected` | GitPushError |
| Clone | `clone`, `repository not found` | GitCloneError |
| Unknown | Any unmatched pattern | GitError (generic) |

### Edge Cases
- Case insensitivity: `ENOTFOUND` should match
- Multiple patterns: `authentication failed 401` should match auth (first pattern wins)
- Empty message: Should return generic GitError
- Special characters: URL-encoded characters in messages

---

## 5. Over-Allocation Calculation Logic

### Decision
Test all date overlap scenarios using explicit date ranges.

### Rationale
- ConflictValidator's `checkOverAllocation` has complex date range logic
- Three overlap conditions must all be tested:
  1. Assignment starts during period
  2. Assignment ends during period
  3. Assignment contains entire period

### Overlap Test Matrix

```
Timeline:  [-------- Period --------]
           Jan 1                    Mar 31

Case 1: Starts During
           [---Assignment---]
           Feb 1         Apr 15

Case 2: Ends During
    [---Assignment---]
    Dec 1         Feb 15

Case 3: Contains Period
[--------Assignment--------]
Dec 1                      Apr 30

Case 4: No Overlap (Before)
[---Assignment---]
Oct 1       Nov 30

Case 5: No Overlap (After)
                          [---Assignment---]
                          Apr 15       Jun 30
```

### Test Data Patterns

```typescript
// Standard test dates
const PERIOD_START = '2024-01-01';
const PERIOD_END = '2024-03-31';

// Overlapping assignments
const startsWithin = { start_date: '2024-02-01', end_date: '2024-04-15' };
const endsWithin = { start_date: '2023-12-01', end_date: '2024-02-15' };
const containsPeriod = { start_date: '2023-12-01', end_date: '2024-04-30' };

// Non-overlapping
const beforePeriod = { start_date: '2023-10-01', end_date: '2023-11-30' };
const afterPeriod = { start_date: '2024-04-15', end_date: '2024-06-30' };
```

---

## 6. Test Organization and Naming

### Decision
Follow established Tier 1 pattern with descriptive `describe` blocks and consistent test naming.

### Rationale
- Consistent with existing codebase patterns
- Makes test output readable and debugging easier

### File Structure

```
tests/unit/server/services/git/__tests__/
├── ConflictValidator.test.ts      (~80 tests)
├── GitErrors.test.ts              (~60 tests)
├── GitHealthCheck.test.ts         (~70 tests)
├── GitConflictResolver.test.ts    (existing - Tier 1)
├── ScenarioExporter.test.ts       (existing - Tier 1)
├── GitRepositoryService.test.ts   (existing - Tier 1)
└── git-test-infrastructure.test.ts (existing - #104)
```

### Naming Convention

```typescript
describe('ConflictValidator', () => {
  describe('checkOverAllocation', () => {
    describe('Overlap Detection', () => {
      test('should detect overlap when assignment starts during period', () => {});
      test('should detect overlap when assignment ends during period', () => {});
      test('should detect overlap when assignment contains entire period', () => {});
      test('should NOT detect overlap when assignment is before period', () => {});
    });

    describe('Allocation Calculation', () => {
      test('should sum allocations from all overlapping assignments', () => {});
      test('should exclude specified assignment from calculation', () => {});
    });

    describe('Warning Generation', () => {
      test('should generate warning when total exceeds 100%', () => {});
      test('should NOT generate warning when total is exactly 100%', () => {});
    });
  });
});
```

---

## 7. Code Coverage Strategy

### Decision
Configure Jest to generate coverage reports for Tier 2 services with specific thresholds.

### Rationale
- Different services have different coverage targets (100% for pure logic, 85%/80% for I/O)
- Coverage reporting helps identify untested branches

### Coverage Configuration

```javascript
// In jest.config.cjs or per-test run
collectCoverageFrom: [
  'src/server/services/git/ConflictValidator.ts',
  'src/server/services/git/GitErrors.ts',
  'src/server/services/git/GitHealthCheck.ts',
],
coverageThreshold: {
  'src/server/services/git/GitErrors.ts': {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100,
  },
  'src/server/services/git/ConflictValidator.ts': {
    statements: 85,
    branches: 80,
  },
  'src/server/services/git/GitHealthCheck.ts': {
    statements: 85,
    branches: 80,
  },
},
```

### Run Command

```bash
npm test -- --coverage --collectCoverageFrom='src/server/services/git/{ConflictValidator,GitErrors,GitHealthCheck}.ts' tests/unit/server/services/git/__tests__/{ConflictValidator,GitErrors,GitHealthCheck}.test.ts
```

---

## Summary

All research questions have been resolved:

| Topic | Decision | Confidence |
|-------|----------|------------|
| Knex mocking | Inline mock functions | High (matches Tier 1 pattern) |
| HTTP mocking | Jest module mocks | High (lightweight, explicit) |
| FS mocking | Jest module mocks for statfs/access | High (standard approach) |
| Error coverage | Complete pattern matrix | High (derived from source) |
| Date overlap | Explicit test matrix | High (comprehensive) |
| Test organization | Follow Tier 1 structure | High (consistency) |
| Coverage thresholds | Service-specific targets | High (matches spec) |

No unresolved clarifications remain.
