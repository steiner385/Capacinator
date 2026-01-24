# Data Model: Git-Based Multi-User Collaboration

**Feature**: 001-git-sync-integration
**Date**: 2026-01-24

## Overview

This document maps existing Capacinator entities to the Git-First architecture, defines new Git integration entities, and specifies JSON schema versioning strategy.

---

## Entity Mapping: SQLite → Git Repository

### Existing Entities (PRESERVED in SQLite as cache)

| SQLite Table | Git JSON File | Sync Strategy |
|--------------|---------------|---------------|
| `projects` | `scenarios/working/projects.json` | Export on sync, import on pull |
| `people` | `scenarios/working/people.json` | Export on sync, import on pull |
| `assignments` (`project_assignments`) | `scenarios/working/assignments.json` | Export on sync, import on pull |
| `project_phases` | `scenarios/working/project_phases.json` | Export on sync, import on pull |
| `roles` | `master-data/roles.json` | Infrequent changes, manual sync |
| `locations` | `master-data/locations.json` | Infrequent changes, manual sync |
| `project_types` | `master-data/project_types.json` | Infrequent changes, manual sync |
| `scenarios` | **DEPRECATED** - Git branches replace | Migration required |
| `audit_logs` | `audit/changes.jsonl` | Append-only, optional supplement to Git history |

**Migration Notes**:
- **Existing scenario tables** (`scenarios`, `scenario_project_assignments`, etc.) become obsolete
- **Git branches** become primary scenario storage (working scenario = local changes, committed = repository main branch)
- **SQLite schema preserved** but data rebuilt from JSON on each app startup

---

## New Entities (Git Integration)

### 1. SyncOperation

**Purpose**: Track sync operations (clone, pull, push) with status and conflict metadata

**Fields**:
```typescript
interface SyncOperation {
  id: string;                    // UUID
  type: 'clone' | 'pull' | 'push' | 'merge';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'conflict';
  startedAt: Date;
  completedAt?: Date;
  conflictCount: number;
  errorMessage?: string;
  userId: string;                // Person who initiated sync
}
```

**Storage**: In-memory during sync, persisted to `localStorage` for UI state

---

### 2. Conflict

**Purpose**: Represent merge conflicts requiring user resolution

**Fields**:
```typescript
interface Conflict {
  id: string;                    // UUID
  syncOperationId: string;       // FK to SyncOperation
  entityType: 'project' | 'person' | assignment' | 'project_phase';
  entityId: string;              // UUID of conflicting record
  field: string;                 // Conflicting field name
  baseValue: any;                // Common ancestor value
  localValue: any;               // User's current value
  remoteValue: any;              // Remote repository value
  resolutionStatus: 'pending' | 'resolved' | 'deferred';
  resolvedValue?: any;           // User's chosen resolution
  resolvedAt?: Date;
  resolvedBy?: string;           // User who resolved
}
```

**Storage**: Temporary table in SQLite (cleared after resolution)

---

### 3. ChangeHistoryEntry

**Purpose**: Git commit history presented as user-friendly change log

**Fields**:
```typescript
interface ChangeHistoryEntry {
  commitSha: string;             // Git commit hash
  author: string;                // Git author email
  authorName: string;            // Git author name
  timestamp: Date;               // Commit date
  message: string;               // Commit message
  entityType?: string;           // Inferred from changed files
  entityId?: string;             // Inferred from JSON content
  diffSummary: {                 // Parsed from Git diff
    added: number;               // Lines added
    removed: number;             // Lines removed
    filesChanged: string[];      // List of JSON files
  };
}
```

**Storage**: Fetched on-demand from Git history (not stored in SQLite)

---

### 4. GitCredential

**Purpose**: Store GitHub Enterprise authentication tokens

**Fields**:
```typescript
interface GitCredential {
  userId: string;                // Person ID (FK to people table)
  provider: 'github-enterprise';
  credentialType: 'personal-access-token' | 'oauth';
  token: string;                 // Encrypted via electron-store
  repositoryUrl: string;         // e.g., https://github.enterprise.com/org/capacinator-data
  expiresAt?: Date;              // Token expiration (90 days for PAT)
  createdAt: Date;
  lastUsedAt?: Date;
}
```

**Storage**: Electron secure storage (`electron-store` with encryption key)

---

### 5. BranchMetadata

**Purpose**: Track scenario branches (experimental "what-if" scenarios)

**Fields**:
```typescript
interface BranchMetadata {
  branchName: string;            // Git branch name (e.g., "scenario-q1-optimistic")
  createdAt: Date;
  createdBy: string;             // User email
  parentBranch: string;          // Usually "main"
  mergeStatus: 'unmerged' | 'merged' | 'abandoned';
  description: string;           // User-provided description
  lastSyncedAt: Date;
}
```

**Storage**: Stored in `scenarios/branches.json` in Git repository

---

## JSON Schema Definitions

### Project JSON Schema (v1.0.0)

```typescript
import { z } from 'zod';

export const ProjectJSONSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  exportedAt: z.string().datetime(),
  exportedBy: z.string().email().optional(),
  scenarioId: z.string(),
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    projectTypeId: z.string().uuid().nullable(),
    projectSubTypeId: z.string().uuid().nullable(),
    locationId: z.string().uuid().nullable(),
    priority: z.number().int().min(1).max(5).nullable(),
    includeInDemand: z.boolean().default(true),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  }))
});
```

### Assignment JSON Schema (v1.0.0)

```typescript
export const AssignmentJSONSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  exportedAt: z.string().datetime(),
  exportedBy: z.string().email().optional(),
  scenarioId: z.string(),
  data: z.array(z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    personId: z.string().uuid(),
    roleId: z.string().uuid().nullable(),
    allocationPercentage: z.number().int().min(0).max(200), // Allow over-allocation in data
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(1000).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  }))
});
```

### Schema Version Migration Map

| From Version | To Version | Migration Function | Breaking Change |
|--------------|------------|-------------------|-----------------|
| 1.0.0 | 1.1.0 | `addTagsField()` | No (adds optional `tags: string[]`) |
| 1.1.0 | 2.0.0 | `splitNameField()` | Yes (splits `name` → `firstName`, `lastName`) |

**Migration Example**:
```typescript
export class SchemaM1_0_0__to__1_1_0 {
  migrate(data: ProjectJSON_1_0_0): ProjectJSON_1_1_0 {
    return {
      ...data,
      schemaVersion: '1.1.0',
      data: data.data.map(project => ({
        ...project,
        tags: [] // Add new optional field with default
      }))
    };
  }
}
```

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Enterprise Repository              │
│  capacinator-data/                                          │
│  ├── scenarios/                                             │
│  │   ├── working/                                           │
│  │   │   ├── projects.json ────────────┐                  │
│  │   │   ├── people.json               │                  │
│  │   │   ├── assignments.json ─────────┼─────┐            │
│  │   │   └── project_phases.json       │     │            │
│  │   └── committed/ [same structure]   │     │            │
│  ├── master-data/                       │     │            │
│  │   ├── roles.json                     │     │            │
│  │   ├── locations.json                 │     │            │
│  │   └── project_types.json             │     │            │
│  └── audit/changes.jsonl                │     │            │
└──────────────────────────────────────────┼─────┼────────────┘
                                          │     │
                                    GitRepositoryService
                                    ScenarioExporter
                                          │     │
                                          ↓     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Local SQLite Cache (Ephemeral)            │
│  capacinator-cache.db                                       │
│  ├── projects ←────────────────────────┘     │            │
│  ├── people                                   │            │
│  ├── project_assignments ←────────────────────┘            │
│  ├── project_phases                                        │
│  ├── roles                                                 │
│  ├── locations                                             │
│  ├── project_types                                         │
│  └── [sync metadata: conflicts, sync_operations]          │
└─────────────────────────────────────────────────────────────┘
                                          │
                                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (UI)                       │
│  ├── ScenarioContext (reads from SQLite)                   │
│  ├── GitSyncContext (sync status, conflicts)               │
│  └── ConflictResolutionModal (resolves conflicts)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Sync Operation

### Pull (Refresh from Repository)

```
1. User clicks "Refresh"
2. GitRepositoryService.pull()
   └─> git pull origin main
3. Detect changed files (Git diff)
4. For each changed JSON file:
   └─> ScenarioExporter.importFromJSON(file)
       ├─> Validate schema (Zod)
       ├─> Check version compatibility
       ├─> Apply migrations if needed
       └─> Bulk insert into SQLite (replace existing)
5. Compare local uncommitted changes vs. pulled changes
6. If conflicts detected:
   └─> GitConflictResolver.detectConflicts()
       └─> Create Conflict records
7. Update UI (show conflicts or "Synced" status)
```

### Push (Publish Local Changes)

```
1. User clicks "Save & Sync"
2. ScenarioExporter.exportToJSON()
   └─> Read SQLite (projects, people, assignments, phases)
   └─> Generate JSON files (scenarios/working/*.json)
   └─> Validate schema (Zod)
3. GitRepositoryService.commit()
   └─> git add scenarios/working/*.json
   └─> git commit -m "Updated 5 projects, 12 assignments (User: john@example.com)"
4. GitRepositoryService.push()
   └─> git push origin main
5. If push rejected (non-fast-forward):
   └─> Pull first, resolve conflicts, retry push
6. Update UI ("Synced" status)
```

---

## Backward Compatibility

**Existing Data Migration**:

1. **One-time export** of current SQLite database to initial Git repository:
   ```bash
   npm run migrate:to-git -- --database=capacinator-dev.db --output=../capacinator-data
   ```

2. **Scenario table migration**:
   - Export existing `scenarios` table records → Create Git branches
   - Export `scenario_project_assignments` → JSON files per scenario branch
   - Map `parent_scenario_id` → Git branch parent

3. **Audit log migration**:
   - Existing `audit_logs` table → `audit/changes.jsonl` (one-time export)
   - Future audits → Git commit history + optional JSONL supplement

---

## Performance Considerations

**SQLite Cache Rebuild**:
- **Target**: < 3 seconds for 100 projects, 50 people, 500 assignments
- **Optimization**: Bulk insert with batch size 100, disable foreign keys during import

**Git Operations**:
- **Clone**: Shallow clone (`--depth 1`) for faster initial setup
- **Pull**: Incremental fetch (only new commits)
- **Push**: Compress objects before push (Git default)

**Conflict Detection**:
- **Target**: < 1 second
- **Optimization**: In-memory diff, no database queries during conflict detection

---

## Schema Evolution Strategy

**Adding New Fields** (Non-Breaking):
1. Increment schema version (MINOR: 1.0.0 → 1.1.0)
2. Add field to JSON schema with default value
3. Importer checks version, applies migration if old version detected
4. Old clients ignore new fields (forward compatibility)

**Renaming/Removing Fields** (Breaking):
1. Increment schema version (MAJOR: 1.0.0 → 2.0.0)
2. Create migration function (remap old field names)
3. Importer rejects incompatible versions unless migration applied
4. Users must update app to import new schema versions

---

## Summary

**Entity Count**:
- **Existing (preserved)**: 7 core entities (projects, people, assignments, phases, roles, locations, types)
- **New (Git integration)**: 5 entities (SyncOperation, Conflict, ChangeHistoryEntry, GitCredential, BranchMetadata)
- **Deprecated**: 4 scenario tables (replaced by Git branches)

**JSON Files**: 7 files per scenario (projects, people, assignments, phases) + 3 master data files

**Schema Version**: 1.0.0 (initial), designed for forward/backward compatibility via migration framework
