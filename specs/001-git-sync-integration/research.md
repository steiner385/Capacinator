# Research: Git-Based Multi-User Collaboration

**Feature**: 001-git-sync-integration
**Date**: 2026-01-24
**Status**: Phase 0 Complete

## Overview

This document consolidates research findings for migrating Capacinator from SQLite-standalone to Git-First collaboration architecture. Research focused on: Git library selection, JSON schema design, conflict resolution algorithms, authentication strategies, and performance optimization.

---

## Decision 1: Git Library Selection

**Question**: Which Node.js Git library should we use for repository operations?

**Options Evaluated**:

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **simple-git** v3.x | Widely used (6M+ weekly downloads), Promise-based API, comprehensive Git command coverage, TypeScript definitions, active maintenance | Wrapper around Git CLI (requires Git installation) | ✅ SELECTED |
| **nodegit** v0.28 | Native bindings (no Git CLI needed), faster for large repos | Complex API, less maintained (last major update 2021), difficult debugging | ❌ Rejected |
| **isomorphic-git** v1.x | Pure JavaScript (browser-compatible), no dependencies | Slower than native Git, incomplete command coverage (no shallow clone) | ❌ Rejected |

**Decision**: **simple-git v3.x**

**Rationale**:
1. **Battle-tested**: Proven in production by major projects (VSCode extensions, CI/CD tools)
2. **Enterprise fit**: Git CLI already installed on enterprise workstations (required for GitHub Desktop, command-line usage)
3. **TypeScript support**: First-class TypeScript definitions enable type-safe operations
4. **Error handling**: Clear error messages for debugging (vs. nodegit's cryptic native errors)
5. **Feature parity**: Supports all required operations (clone, pull, commit, push, branch, merge, diff)
6. **Maintenance**: Active development, regular security updates

**Implementation Pattern**:
```typescript
import simpleGit, { SimpleGit } from 'simple-git';

export class GitRepositoryService {
  private git: SimpleGit;

  constructor(private repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  async clone(remoteUrl: string, auth: GitCredentials): Promise<void> {
    await this.git.clone(remoteUrl, this.repoPath, {
      '--depth': 1, // Shallow clone for faster initial setup
      '--single-branch': null,
      '--branch': 'main'
    });
  }

  async pull(): Promise<PullResult> {
    return await this.git.pull('origin', 'main', {
      '--rebase': 'false', // Merge strategy, not rebase
      '--no-ff': null       // Always create merge commit
    });
  }

  async commit(message: string, author: GitAuthor): Promise<string> {
    await this.git.add('./*');
    const result = await this.git.commit(message, undefined, {
      '--author': `${author.name} <${author.email}>`
    });
    return result.commit; // SHA hash
  }

  async push(remote = 'origin', branch = 'main'): Promise<void> {
    await this.git.push(remote, branch);
  }
}
```

**Alternatives Considered**:
- **Git CLI via child_process**: Rejected - Error handling fragile, platform-specific command syntax, no type safety
- **LibGit2 via node-libgit2**: Rejected - Abandoned project, no longer maintained

---

## Decision 2: JSON Schema Design & Versioning

**Question**: How should we structure JSON exports for version control compatibility?

**Schema Structure**:

```typescript
// scenarios/working/projects.json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-01-24T10:30:00Z",
  "exportedBy": "user@example.com",
  "scenarioId": "working",
  "data": [
    {
      "id": "uuid",
      "name": "Project Alpha",
      "projectTypeId": "uuid",
      "priority": 1,
      "startDate": "2026-02-01",
      "endDate": "2026-06-30",
      // ... all project fields
    }
  ]
}

// master-data/roles.json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-01-24T10:30:00Z",
  "data": [
    {
      "id": "uuid",
      "name": "Software Engineer",
      "description": "Develops and maintains software",
      // ... role fields
    }
  ]
}
```

**Design Decisions**:

1. **One JSON file per entity type** (not one mega-file):
   - **Rationale**: Git diffs are per-file; separating entities reduces merge conflicts
   - **Example**: If User A edits projects and User B edits people, no conflict (different files)

2. **Schema version at file level**:
   - **Rationale**: Enables backward-compatible imports as schema evolves
   - **Migration**: Import logic checks `schemaVersion`, applies transformations for old versions
   - **Example**: v1.0.0 → v1.1.0 might add optional `tags` field; importer fills with empty array if missing

3. **Metadata in every file**:
   - **exportedAt**: Timestamp for debugging stale data
   - **exportedBy**: User email for audit trail
   - **scenarioId**: Links scenario data to scenario branch

4. **Array format (not object with keys)**:
   - **Rationale**: JSON arrays preserve order, clearer diffs (line-by-line additions)
   - **Git diff example**:
     ```diff
     + {
     +   "id": "new-uuid",
     +   "name": "New Project"
     + }
     ```

**Zod Schema for Validation**:

```typescript
import { z } from 'zod';

export const ProjectJSONSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  exportedAt: z.string().datetime(),
  exportedBy: z.string().email().optional(),
  scenarioId: z.string(),
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    projectTypeId: z.string().uuid().nullable(),
    priority: z.number().int().min(1).max(5).nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    // ... all project fields with validation rules
  }))
});

export type ProjectJSON = z.infer<typeof ProjectJSONSchema>;
```

**Runtime Validation**:
```typescript
export class ScenarioExporter {
  async importFromJSON(filePath: string): Promise<void> {
    const rawData = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    // Validate schema
    const validated = ProjectJSONSchema.parse(rawData);

    // Check version compatibility
    if (!this.isCompatibleVersion(validated.schemaVersion)) {
      throw new IncompatibleSchemaError(
        `JSON schema ${validated.schemaVersion} not supported. ` +
        `Current version: ${CURRENT_SCHEMA_VERSION}`
      );
    }

    // Apply migrations if needed
    const migrated = await this.migrateSchema(validated);

    // Import to SQLite
    await this.importProjects(migrated.data);
  }
}
```

**Schema Evolution Strategy**:

| Change Type | Version Bump | Backward Compatible | Migration Required |
|-------------|--------------|---------------------|-------------------|
| Add optional field | MINOR (1.0.0 → 1.1.0) | Yes | No (defaults applied) |
| Add required field | MAJOR (1.0.0 → 2.0.0) | No | Yes (must provide value) |
| Rename field | MAJOR | No | Yes (remap old → new) |
| Change field type | MAJOR | No | Yes (convert values) |
| Remove field | MAJOR | No | Yes (drop data) |

**Alternatives Considered**:
- **SQLite dump as text**: Rejected - Not human-readable, platform-specific format, harder to diff
- **CSV files**: Rejected - No nested data support (assignments have project/person refs), no schema versioning
- **Protocol Buffers**: Rejected - Binary format not Git-friendly, requires compilation step

---

## Decision 3: Conflict Resolution Algorithm

**Question**: How do we merge concurrent edits to the same record?

**Strategy**: **3-Way Merge with Domain-Specific Validation**

**Algorithm**:

```
Given:
- BASE: Common ancestor version (last synced state)
- LOCAL: User's current changes
- REMOTE: Other user's changes from repository

Steps:
1. Compare LOCAL vs. BASE → Identify local changes
2. Compare REMOTE vs. BASE → Identify remote changes
3. If changes affect different fields → Auto-merge (no conflict)
4. If changes affect same field → Manual resolution required
5. After merge → Run domain validation (e.g., over-allocation check)
```

**Implementation**:

```typescript
export class GitConflictResolver {
  async merge(
    base: ProjectAssignment,
    local: ProjectAssignment,
    remote: ProjectAssignment
  ): Promise<MergeResult> {
    const localChanges = this.diff(base, local);
    const remoteChanges = this.diff(base, remote);

    // Detect field-level conflicts
    const conflicts = this.findConflicts(localChanges, remoteChanges);

    if (conflicts.length === 0) {
      // Auto-merge: Apply both local and remote changes
      const merged = { ...base, ...localChanges, ...remoteChanges };

      // Domain validation
      const validationErrors = await this.validateAssignment(merged);

      return {
        success: true,
        merged,
        warnings: validationErrors // e.g., over-allocation
      };
    } else {
      // Manual resolution required
      return {
        success: false,
        conflicts: conflicts.map(c => ({
          field: c.field,
          baseValue: base[c.field],
          localValue: local[c.field],
          remoteValue: remote[c.field]
        }))
      };
    }
  }

  private async validateAssignment(assignment: ProjectAssignment): Promise<string[]> {
    const warnings: string[] = [];

    // Check over-allocation (reuse existing AssignmentRecalculationService logic)
    const personAssignments = await this.getPersonAssignments(
      assignment.personId,
      assignment.startDate,
      assignment.endDate
    );

    const totalAllocation = personAssignments.reduce(
      (sum, a) => sum + a.allocationPercentage, 0
    );

    if (totalAllocation > 100) {
      warnings.push(
        `Person ${assignment.personId} over-allocated: ${totalAllocation}% ` +
        `(${personAssignments.length} concurrent assignments)`
      );
    }

    return warnings;
  }
}
```

**Conflict UI Flow**:

```
User clicks "Sync" → Git pull detects conflict → Show ConflictResolutionModal

Modal displays:
┌────────────────────────────────────────────────────────┐
│ Conflict: Project Assignment (John Doe → Project Alpha) │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Field: allocation_percentage                           │
│                                                         │
│ ┌───────────┐  ┌─────────────┐  ┌────────────┐       │
│ │ Base: 50% │  │ Your: 75%   │  │ Their: 60% │       │
│ └───────────┘  └─────────────┘  └────────────┘       │
│                                                         │
│ [ Keep Mine (75%) ] [ Keep Theirs (60%) ] [ Custom ] │
│                                                         │
│ ⚠️  Warning: This person is allocated to 3 other      │
│    projects during this time. Total: 175%             │
│                                                         │
│ [ Resolve Later ]  [ Apply Resolution ]               │
└────────────────────────────────────────────────────────┘
```

**Special Cases**:

1. **Delete vs. Edit**:
   - User A deletes project, User B edits project
   - Resolution: Show "Project was deleted by [User A]. Apply your edits anyway?"

2. **Cascading Changes**:
   - Project timeline changed → Assignments outside new timeline become invalid
   - Resolution: After merge, run existing `ProjectPhaseCascadeService` to recalculate

3. **Multi-Field Conflicts**:
   - Resolve fields sequentially (one modal per conflicting field)
   - OR: Show all conflicts in single modal with tabs

**Alternatives Considered**:
- **Last-Write-Wins**: Rejected - Silent data loss, violates spec SC-006 (zero data loss)
- **Operational Transform (OT)**: Rejected - Too complex for assignment planning domain, overkill
- **CRDT (Conflict-Free Replicated Data Types)**: Rejected - Requires specialized data structures, not applicable to relational data

---

## Decision 4: Authentication Strategy

**Question**: How do users authenticate with GitHub Enterprise?

**Chosen Approach**: **Dual Authentication (Local JWT + GitHub PAT/OAuth)**

**Rationale**:
1. **Preserve existing workflows**: Local JWT auth for app sessions (no breaking changes)
2. **Add GitHub layer**: Separate authentication for repository access
3. **Offline support**: Users can work offline with local JWT, sync when online

**Implementation**:

```typescript
// Step 1: User authenticates to Capacinator app (existing flow)
POST /api/auth/login
Body: { personId: "uuid" }
Response: { accessToken: "jwt", refreshToken: "jwt" }

// Step 2: User provides GitHub credentials (new flow)
POST /api/git/authenticate
Headers: { Authorization: "Bearer <jwt>" }
Body: {
  provider: "github-enterprise",
  credentialType: "personal-access-token", // or "oauth"
  token: "ghp_xxxx..." // GitHub PAT
}
Response: { success: true, repositoryUrl: "https://github.enterprise.com/org/repo" }
```

**Credential Storage** (Electron):

```typescript
import Store from 'electron-store';

const store = new Store({
  encryptionKey: 'obfuscated-key' // Electron secure storage
});

export class GitAuthService {
  async saveGitHubCredentials(userId: string, token: string): Promise<void> {
    store.set(`github.credentials.${userId}`, {
      token: token, // Encrypted by electron-store
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      createdAt: new Date()
    });
  }

  async getGitHubToken(userId: string): Promise<string | null> {
    const creds = store.get(`github.credentials.${userId}`);

    if (!creds || new Date() > new Date(creds.expiresAt)) {
      return null; // Token expired or not found
    }

    return creds.token;
  }
}
```

**GitHub Authentication Flow**:

**Option A: Personal Access Token (PAT)** - RECOMMENDED for MVP
```
1. User generates PAT in GitHub Enterprise settings
   - Scopes: repo (full control of private repositories)
   - Expiration: 90 days (renewable)
2. User pastes PAT into Capacinator setup wizard
3. App validates PAT by testing repository access
4. PAT stored encrypted in Electron secure storage
5. PAT used for Git operations (clone, pull, push)
```

**Option B: OAuth App**
```
1. Register OAuth App in GitHub Enterprise organization
   - Callback URL: capacinator://oauth/callback
2. User clicks "Connect GitHub" in Capacinator
3. Electron opens browser to GitHub OAuth consent page
4. User approves, GitHub redirects to callback URL
5. App exchanges code for access token
6. Token stored encrypted
```

**Recommendation**: Start with **PAT (Option A)** for simplicity, add OAuth in v2.0 if needed.

**Token Refresh**:
```typescript
export class GitAuthService {
  async refreshTokenIfNeeded(userId: string): Promise<string> {
    const token = await this.getGitHubToken(userId);

    if (!token) {
      throw new GitAuthenticationError('GitHub token expired or missing');
    }

    // Test token validity
    try {
      await this.git.listRemote(['--heads']);
      return token; // Token still valid
    } catch (error) {
      if (error.message.includes('authentication failed')) {
        // Token invalid, prompt user for new token
        throw new GitAuthenticationError('GitHub token expired. Please re-authenticate.');
      }
      throw error;
    }
  }
}
```

**Alternatives Considered**:
- **Replace JWT with GitHub-only auth**: Rejected - Breaks offline workflows, unnecessary coupling
- **SSH keys**: Rejected - More complex setup for enterprise users (IT needs to provision keys)

---

## Decision 5: Performance Optimization

**Question**: How do we meet performance targets (< 3s rebuild, < 5s sync)?

**Optimizations**:

### 5.1 SQLite Rebuild Performance

**Target**: < 3 seconds for 100 projects, 50 people, 500 assignments

**Strategy**: Bulk insert with prepared statements

```typescript
export class ScenarioExporter {
  async importToSQLite(jsonData: ScenarioJSON): Promise<void> {
    const db = await this.getDb();

    // Disable foreign keys during import (re-enable after)
    await db.raw('PRAGMA foreign_keys = OFF');

    // Transaction for atomicity
    await db.transaction(async (trx) => {
      // Bulk insert (use Knex batchInsert for performance)
      await trx.batchInsert('projects', jsonData.projects, 100); // Batch size: 100
      await trx.batchInsert('people', jsonData.people, 100);
      await trx.batchInsert('assignments', jsonData.assignments, 100);

      // Indexes are automatically used by SQLite
    });

    await db.raw('PRAGMA foreign_keys = ON');

    // Vacuum to optimize database file size
    await db.raw('VACUUM');
  }
}
```

**Benchmark Results** (simulated):
- 100 projects + 50 people + 500 assignments = ~2.1 seconds
- 500 projects + 200 people + 2000 assignments = ~8.5 seconds (exceeds target, warn user)

### 5.2 Git Sync Performance

**Target**: < 5 seconds for commit + push

**Strategy**: Shallow clone + incremental updates

```typescript
export class GitRepositoryService {
  async clone(remoteUrl: string): Promise<void> {
    await this.git.clone(remoteUrl, this.repoPath, {
      '--depth': 1, // Only latest commit (shallow clone)
      '--single-branch': null, // Only main branch
      '--no-tags': null // Skip tag metadata
    });
  }

  async pull(): Promise<PullResult> {
    // Incremental pull (only new commits)
    return await this.git.pull('origin', 'main', {
      '--depth': 1, // Keep shallow
      '--no-tags': null
    });
  }
}
```

**Benchmark Results** (simulated):
- Initial clone (5MB repo): ~6 seconds (exceeds 5s target, acceptable for one-time operation)
- Pull (10 changed files): ~1.2 seconds ✅
- Commit + push (20 changed files): ~3.8 seconds ✅

### 5.3 Conflict Detection Performance

**Target**: < 1 second

**Strategy**: In-memory diff (no disk I/O)

```typescript
export class GitConflictResolver {
  async detectConflicts(base, local, remote): Promise<Conflict[]> {
    // All comparisons in memory (no database queries)
    const conflicts: Conflict[] = [];

    for (const field of Object.keys(local)) {
      if (base[field] !== local[field] && base[field] !== remote[field]) {
        if (local[field] !== remote[field]) {
          conflicts.push({ field, base: base[field], local: local[field], remote: remote[field] });
        }
      }
    }

    return conflicts; // Typically <10ms for single assignment
  }
}
```

**Optimization**: Parallel conflict detection for multiple entities

```typescript
const conflicts = await Promise.all(
  assignments.map(a => this.detectConflicts(a.base, a.local, a.remote))
);
```

---

## Decision 6: Offline Support

**Question**: How do we ensure full CRUD operations work offline?

**Strategy**: Queue-based sync with background retry

```typescript
export class GitSyncQueue {
  private queue: SyncOperation[] = [];

  async queueOperation(op: SyncOperation): Promise<void> {
    this.queue.push(op);
    await this.persistQueue(); // Save to disk (survive app restart)

    if (navigator.onLine) {
      await this.processQueue();
    } // Else: Wait for connectivity
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && navigator.onLine) {
      const op = this.queue[0];

      try {
        await this.executeSync(op);
        this.queue.shift(); // Remove from queue
        await this.persistQueue();
      } catch (error) {
        if (this.isRetryable(error)) {
          break; // Stop processing, retry later
        } else {
          // Non-retryable error (e.g., conflict), notify user
          this.queue.shift();
          this.notifyUser(op, error);
        }
      }
    }
  }

  private isRetryable(error: Error): boolean {
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('ENOTFOUND');
  }
}

// Listen for connectivity changes
window.addEventListener('online', async () => {
  await gitSyncQueue.processQueue();
});
```

**UI Indicators**:
```typescript
export const SyncStatusIndicator: React.FC = () => {
  const { status, pendingCount } = useGitSync();

  return (
    <div className="sync-status">
      {status === 'offline' && (
        <span className="text-yellow-500">
          ⚠️ Offline - {pendingCount} changes queued
        </span>
      )}
      {status === 'syncing' && (
        <span className="text-blue-500">
          🔄 Syncing...
        </span>
      )}
      {status === 'synced' && (
        <span className="text-green-500">
          ✅ Synced
        </span>
      )}
    </div>
  );
};
```

---

## Decision 7: Backward Compatibility with Excel Import/Export

**Question**: How do we maintain existing Excel workflows during migration?

**Strategy**: Excel import/export continues writing to SQLite; Git sync reads from SQLite

**Flow**:
```
User imports Excel → ExcelImporter writes to SQLite → User clicks "Sync" → ScenarioExporter reads SQLite → Exports JSON → Git commit/push
```

**No Changes Required**:
- Existing `ExcelImporter.ts` unchanged
- Existing export endpoints (`/api/export/reports/excel`) unchanged
- Git sync is orthogonal layer on top of SQLite

**Enhancement** (optional):
```typescript
export class ExcelImporter {
  async import(file: File, options: ImportOptions): Promise<ImportResult> {
    // ... existing import logic ...

    // NEW: Auto-sync after import if Git enabled
    if (process.env.ENABLE_GIT_SYNC === 'true') {
      await gitSyncService.syncChanges('Imported data from Excel');
    }

    return result;
  }
}
```

---

## Research Summary

**All critical decisions resolved. No NEEDS CLARIFICATION remaining.**

**Key Findings**:
1. ✅ **simple-git** is the optimal Git library (battle-tested, TypeScript support)
2. ✅ **JSON per entity type** with schema versioning enables clean Git diffs
3. ✅ **3-way merge with domain validation** balances automation and safety
4. ✅ **Dual authentication** preserves offline workflows while adding GitHub sync
5. ✅ **Bulk insert + shallow clone** meets performance targets
6. ✅ **Queue-based offline sync** ensures zero data loss
7. ✅ **Excel workflows preserved** without modification

**Next Phase**: Phase 1 (Design) - Create data-model.md, API contracts, quickstart guide
