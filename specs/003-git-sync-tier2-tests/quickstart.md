# Quickstart: Git Sync Unit Tests - Tier 2 Validation & Safety

**Feature Branch**: `003-git-sync-tier2-tests`
**Date**: 2026-01-25
**Target**: 210 unit tests

## Prerequisites

1. Node.js 20+ installed
2. Project dependencies installed (`npm install`)
3. Tier 1 tests passing (Issue #105)

## Quick Verification

```bash
# Verify services exist
ls src/server/services/git/{ConflictValidator,GitErrors,GitHealthCheck}.ts

# Verify test infrastructure works
npm test -- tests/unit/server/services/git/__tests__/git-test-infrastructure.test.ts
```

## Test File Locations

Create tests in:
```
tests/unit/server/services/git/__tests__/
├── ConflictValidator.test.ts    (~80 tests) - NEW
├── GitErrors.test.ts            (~60 tests) - NEW
├── GitHealthCheck.test.ts       (~70 tests) - NEW
```

## Running Tests

### Run All Tier 2 Tests

```bash
npm test -- tests/unit/server/services/git/__tests__/{ConflictValidator,GitErrors,GitHealthCheck}.test.ts
```

### Run Single Test File

```bash
# ConflictValidator only
npm test -- tests/unit/server/services/git/__tests__/ConflictValidator.test.ts

# GitErrors only
npm test -- tests/unit/server/services/git/__tests__/GitErrors.test.ts

# GitHealthCheck only
npm test -- tests/unit/server/services/git/__tests__/GitHealthCheck.test.ts
```

### Run with Coverage

```bash
npm test -- --coverage \
  --collectCoverageFrom='src/server/services/git/{ConflictValidator,GitErrors,GitHealthCheck}.ts' \
  tests/unit/server/services/git/__tests__/{ConflictValidator,GitErrors,GitHealthCheck}.test.ts
```

### Watch Mode (Development)

```bash
npm test -- --watch tests/unit/server/services/git/__tests__/ConflictValidator.test.ts
```

## Test Templates

### ConflictValidator Test Template

```typescript
/**
 * ConflictValidator Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #106 - Git Sync Unit Tests - Tier 2 Validation & Safety
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Knex } from 'knex';
import { ConflictValidator } from '../../../../../../src/server/services/git/ConflictValidator.js';

// Mock database factory
function createMockDb(config: {
  assignments?: any[];
  people?: any[];
  projects?: any[];
  phases?: any[];
} = {}) {
  const mockDb = jest.fn().mockImplementation((table: string) => {
    // ... implementation
  });
  return mockDb as unknown as Knex;
}

describe('ConflictValidator', () => {
  let validator: ConflictValidator;
  let mockDb: Knex;

  beforeEach(() => {
    mockDb = createMockDb();
    validator = new ConflictValidator(mockDb);
  });

  describe('checkOverAllocation', () => {
    test('should detect over-allocation when total exceeds 100%', async () => {
      // Arrange
      mockDb = createMockDb({
        people: [{ id: 'p1', first_name: 'John', last_name: 'Doe' }],
        assignments: [
          { id: 'a1', person_id: 'p1', allocation_percent: 60, start_date: '2024-01-01', end_date: '2024-03-31' },
        ],
      });
      validator = new ConflictValidator(mockDb);

      // Act
      const warnings = await validator.checkOverAllocation('p1', '2024-01-01', '2024-03-31', 50);

      // Assert
      expect(warnings).toHaveLength(1);
      expect(warnings[0].totalAllocation).toBe(110);
    });
  });
});
```

### GitErrors Test Template

```typescript
/**
 * GitErrors Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #106 - Git Sync Unit Tests - Tier 2 Validation & Safety
 */

import { describe, test, expect } from '@jest/globals';
import {
  GitError,
  GitNetworkError,
  GitAuthenticationError,
  categorizeGitError,
} from '../../../../../../src/server/services/git/GitErrors.js';

describe('GitErrors', () => {
  describe('categorizeGitError', () => {
    test('should categorize ENOTFOUND as network error', () => {
      const error = new Error('getaddrinfo ENOTFOUND github.com');

      const result = categorizeGitError(error, 'clone');

      expect(result).toBeInstanceOf(GitNetworkError);
      expect(result.code).toBe('GIT_NETWORK_ERROR');
    });

    test('should categorize 401 as authentication error', () => {
      const error = new Error('HTTP 401 Unauthorized');

      const result = categorizeGitError(error, 'push');

      expect(result).toBeInstanceOf(GitAuthenticationError);
      expect(result.recoverable).toBe(true);
    });
  });
});
```

### GitHealthCheck Test Template

```typescript
/**
 * GitHealthCheck Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #106 - Git Sync Unit Tests - Tier 2 Validation & Safety
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock modules before imports
jest.mock('https');
jest.mock('http');
jest.mock('fs/promises');

import https from 'https';
import http from 'http';
import fs from 'fs/promises';
import { GitHealthCheck } from '../../../../../../src/server/services/git/GitHealthCheck.js';

describe('GitHealthCheck', () => {
  let healthCheck: GitHealthCheck;

  beforeEach(() => {
    healthCheck = new GitHealthCheck();
    jest.clearAllMocks();
  });

  describe('checkNetworkConnectivity', () => {
    test('should return reachable when server responds with 200', async () => {
      const mockReq = { on: jest.fn().mockReturnThis(), destroy: jest.fn(), end: jest.fn() };
      (https.get as jest.Mock).mockImplementation((_opts, cb) => {
        setTimeout(() => cb({ statusCode: 200, resume: jest.fn() }), 10);
        return mockReq;
      });

      const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

      expect(result.reachable).toBe(true);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkDiskSpace', () => {
    test('should return available when space exceeds requirement', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.statfs as jest.Mock).mockResolvedValue({ bsize: 4096, bavail: 128000 }); // ~500MB

      const result = await healthCheck.checkDiskSpace('/app/data', 100);

      expect(result.available).toBe(true);
      expect(result.freeSpaceMB).toBeGreaterThanOrEqual(100);
    });
  });
});
```

## Coverage Targets

| Service | Statement | Branch |
|---------|-----------|--------|
| ConflictValidator | 85% | 80% |
| GitErrors | 100% | 100% |
| GitHealthCheck | 85% | 80% |

## Success Criteria Checklist

- [ ] ConflictValidator.test.ts created with ~80 tests
- [ ] GitErrors.test.ts created with ~60 tests
- [ ] GitHealthCheck.test.ts created with ~70 tests
- [ ] All 210 tests pass
- [ ] Coverage targets met
- [ ] No flaky tests (5 consecutive runs pass)
- [ ] Tests complete in under 30 seconds
