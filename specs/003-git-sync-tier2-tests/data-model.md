# Data Model: Git Sync Unit Tests - Tier 2 Validation & Safety

**Feature Branch**: `003-git-sync-tier2-tests`
**Date**: 2026-01-25
**Spec**: [spec.md](./spec.md)

## Overview

This document defines the data structures used by Tier 2 services and their test mocks. Since this feature is about testing existing services, the data model captures:
1. Existing service interfaces (what we're testing)
2. Mock data structures (what we create in tests)
3. Test output structures (what we verify)

---

## 1. ConflictValidator Data Structures

### Input: Assignment Data (from database)

```typescript
interface Assignment {
  id: string;
  person_id: string;
  project_id: string;
  allocation_percent: number;
  start_date: string;  // ISO date format
  end_date: string;
}
```

### Input: Person Data (from database)

```typescript
interface Person {
  id: string;
  first_name: string;
  last_name: string;
}
```

### Input: Project Data (from database)

```typescript
interface Project {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}
```

### Input: Phase Data (from database)

```typescript
interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
}
```

### Output: ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  warnings: OverAllocationWarning[];
  errors: string[];
}
```

### Output: OverAllocationWarning

```typescript
interface OverAllocationWarning {
  personId: string;
  personName: string;
  timeframe: string;  // e.g., "2024-01-01 to 2024-03-31"
  totalAllocation: number;  // percentage, e.g., 170 for 170%
  affectedAssignments: Array<{
    assignmentId: string;
    projectName: string;
    allocation: number;
  }>;
}
```

---

## 2. GitErrors Data Structures

### Base Error Interface

```typescript
class GitError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly recoverable: boolean;
}
```

### Error Type Hierarchy

| Error Class | Code | Default Recoverable |
|-------------|------|---------------------|
| GitNetworkError | GIT_NETWORK_ERROR | true |
| GitAuthenticationError | GIT_AUTH_ERROR | true |
| GitPermissionError | GIT_PERMISSION_ERROR | false |
| GitConflictError | GIT_CONFLICT_ERROR | true |
| GitRepositoryStateError | GIT_REPO_STATE_ERROR | false |
| GitDiskSpaceError | GIT_DISK_SPACE_ERROR | true |
| GitBranchError | GIT_BRANCH_ERROR | true |
| GitCloneError | GIT_CLONE_ERROR | true |
| GitPushError | GIT_PUSH_ERROR | true |

### Input: Raw Error (to categorize)

```typescript
// Standard JavaScript Error
interface Error {
  message: string;
  name: string;
  stack?: string;
}
```

### Output: Categorized Error

```typescript
interface CategorizedError extends GitError {
  // Inherits: code, userMessage, recoverable
  // Type-specific properties:
  originalError?: Error;       // Network, Auth, Clone
  operation?: string;          // Permission
  conflictedFiles?: string[];  // Conflict
  state?: string;              // RepositoryState
  requiredMB?: number;         // DiskSpace
  availableMB?: number;        // DiskSpace
  branchName?: string;         // Branch
  reason?: string;             // Branch, Push
  repositoryUrl?: string;      // Clone
}
```

---

## 3. GitHealthCheck Data Structures

### Input: URL for Connectivity Check

```typescript
// Standard URL string
type RepositoryUrl = string;  // e.g., "https://github.enterprise.com/org/repo"
```

### Input: Path for Disk Space Check

```typescript
// Filesystem path
type TargetPath = string;  // e.g., "/app/data/scenarios"
```

### Output: Network Check Result

```typescript
interface NetworkCheckResult {
  reachable: boolean;
  responseTimeMs: number;
  error?: string;
}
```

### Output: Disk Space Check Result

```typescript
interface DiskSpaceCheckResult {
  available: boolean;
  freeSpaceMB: number;
  requiredMB: number;
  error?: string;
}
```

### Output: Comprehensive Health Check Result

```typescript
interface HealthCheckResult {
  network: NetworkCheckResult;
  diskSpace: DiskSpaceCheckResult;
}
```

### Mock: File System Stats (from fs.statfs)

```typescript
interface StatFsResult {
  bsize: number;   // Block size in bytes
  bavail: number;  // Available blocks for non-superuser
  // Other fields exist but are not used
}
```

---

## 4. Test Mock Data Structures

### Mock Database Factory

```typescript
interface MockDbConfig {
  assignments?: Assignment[];
  people?: Person[];
  projects?: Project[];
  phases?: ProjectPhase[];
}

// Factory function signature
function createMockDb(config: MockDbConfig): Knex;
```

### Mock HTTP Response

```typescript
interface MockHttpResponse {
  statusCode: number;
  resume: () => void;
}

interface MockHttpRequest {
  on: (event: string, callback: Function) => MockHttpRequest;
  destroy: () => void;
  end: () => void;
}
```

### Test Scenario Data

```typescript
interface TestAssignmentScenario {
  name: string;
  description: string;
  personId: string;
  existingAssignments: Assignment[];
  newAllocation: number;
  dateRange: {
    start: string;
    end: string;
  };
  expectedWarning: boolean;
  expectedTotalAllocation?: number;
}
```

---

## 5. Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    ConflictValidator Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Person ──────┬──── Assignment ──────┬──── Project              │
│    │          │         │            │        │                 │
│    │          │    allocation_percent │        │                 │
│    │          │    start_date         │        │                 │
│    │          │    end_date           │        │                 │
│    │          │                       │        │                 │
│    └──────────┼───────────────────────┘        │                 │
│               │                                │                 │
│               ▼                                ▼                 │
│     OverAllocationWarning              ProjectPhase             │
│     - totalAllocation                   - start_date            │
│     - affectedAssignments               - end_date              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    GitErrors Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  JavaScript Error ──────► categorizeGitError() ──────► GitError │
│       │                                                   │      │
│   message                                             code       │
│   name                                            userMessage    │
│                                                 recoverable      │
│                                                                  │
│  Pattern Matching:                                               │
│  ├── "enotfound" ─────────────► GitNetworkError                 │
│  ├── "authentication" ────────► GitAuthenticationError          │
│  ├── "permission denied" ─────► GitPermissionError              │
│  ├── "conflict" ──────────────► GitConflictError                │
│  ├── "branch...exists" ───────► GitBranchError                  │
│  ├── "non-fast-forward" ──────► GitPushError                    │
│  ├── "repository not found" ──► GitCloneError                   │
│  └── (default) ───────────────► GitError                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  GitHealthCheck Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Repository URL ────► checkNetworkConnectivity() ───► Result    │
│       │                      │                           │       │
│       │                  http(s).get()             reachable     │
│       │                      │                   responseTimeMs  │
│       │                      ▼                                   │
│       │              [Response < 500] ──► reachable: true       │
│       │              [Response >= 500] ─► reachable: false      │
│       │              [Timeout] ─────────► reachable: false      │
│       │              [Error] ───────────► reachable: false      │
│       │                                                          │
│  Target Path ───────► checkDiskSpace() ─────────────► Result    │
│       │                      │                           │       │
│       │                  fs.access()               available     │
│       │                      │                   freeSpaceMB     │
│       │                      ▼                   requiredMB      │
│       │              fs.statfs()                                │
│       │                      │                                   │
│       │              bavail * bsize / (1024*1024) = MB          │
│       │              [MB >= required] ──► available: true       │
│       │              [MB < required] ───► available: false      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Validation Rules

### Over-Allocation Detection Rules

1. **Total allocation** = sum of overlapping assignments + new allocation
2. **Overlap condition**: Any of these must be true:
   - Assignment starts within period (start_date BETWEEN period_start AND period_end)
   - Assignment ends within period (end_date BETWEEN period_start AND period_end)
   - Assignment contains period (start_date <= period_start AND end_date >= period_end)
3. **Warning threshold**: Total allocation > 100%
4. **Exclusion rule**: Current assignment ID excluded from overlap calculation

### Project Date Validation Rules

1. End date must be >= start date (if both are set)
2. Phase start_date must be >= project start_date
3. Phase end_date must be <= project end_date

### Person Validation Rules

1. first_name is required (non-empty after trim)
2. last_name is required (non-empty after trim)

### Network Connectivity Rules

1. Status < 500 = reachable (includes 2xx, 3xx, 4xx)
2. Status >= 500 = not reachable (server error)
3. Timeout = not reachable
4. Connection error = not reachable

### Disk Space Rules

1. If directory doesn't exist, check parent directory
2. Available MB = bavail * bsize / (1024 * 1024)
3. If available MB >= required MB, space is available
