# Implementation Plan: Git-Based Multi-User Collaboration (Migration from SQLite-Standalone)

**Branch**: `001-git-sync-integration` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-git-sync-integration/spec.md` + Migration from current SQLite-standalone architecture to Git-First collaboration model per Constitution v1.1.0 Principle IX.

## Summary

**Primary Requirement**: Migrate Capacinator from single-user Electron app with local SQLite database to multi-user collaborative system using GitHub Enterprise repository as source of truth, with local SQLite cache rebuilt from JSON on startup.

**Technical Approach**: Implement Git repository integration layer (`GitRepositoryService`, `ScenarioExporter`), preserve existing SQLite database as ephemeral query cache (rebuilt from JSON on app start), add conflict resolution UI for concurrent edits, and maintain backward compatibility with existing Excel import/export and audit logging systems.

**Migration Strategy**: Phased rollout enabling coexistence of old (SQLite-only) and new (Git-synced) modes during transition period, with one-time data migration tool to export existing scenarios to initial Git repository.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES2022 target), Node.js 20+
**Primary Dependencies**:
- **Git Integration**: `simple-git` v3.x (Node.js Git client library)
- **JSON Schema**: `zod` v3.25+ (runtime validation for imported JSON)
- **Conflict Resolution**: Custom merge algorithm using `diff` library for 3-way merge
- **Existing Stack**: React 19, Express 4.18, better-sqlite3 12.2, Knex.js 3.1, Electron 37

**Storage**:
- **Source of Truth**: GitHub Enterprise repository with JSON files under `scenarios/`, `master-data/`, `audit/`
- **Local Cache**: SQLite database (ephemeral, rebuilt from Git on startup)
- **Git Repository Clone**: Stored in Electron userData directory alongside SQLite cache
- **Repository Structure**:
  ```
  capacinator-data/ (GitHub Enterprise repo)
  ├── scenarios/
  │   ├── working/
  │   │   ├── projects.json
  │   │   ├── people.json
  │   │   ├── assignments.json
  │   │   ├── project_phases.json
  │   │   └── metadata.json
  │   └── committed/
  │       └── [same structure]
  ├── master-data/
  │   ├── roles.json
  │   ├── locations.json
  │   └── project_types.json
  └── audit/
      └── changes.jsonl (append-only audit log)
  ```

**Testing**: Jest (unit), Playwright (E2E), new Git conflict simulation tests
**Target Platform**: Electron desktop app (Windows, macOS, Linux)
**Project Type**: Web application (React frontend + Express backend in Electron)

**Performance Goals** (per spec Success Criteria):
- Initial repository clone: < 10 seconds for 5-10MB repo
- Pull updates: < 3 seconds for incremental changes
- Commit + push: < 5 seconds for scenario save
- SQLite rebuild from JSON: < 3 seconds for 100 projects, 50 people, 500 assignments
- Conflict detection: < 1 second after pull

**Constraints**:
- **No new infrastructure**: Must use existing GitHub Enterprise (approved by IT)
- **Backward compatibility**: Excel import/export must continue working
- **Offline-first**: Full CRUD operations must work without network connectivity
- **Zero data loss**: All sync operations must preserve user changes (conflicts shown, never silently overwritten)
- **Electron packaging**: All dependencies must be bundleable with electron-builder
- **SQLite as cache only**: Existing migrations preserved but SQLite becomes rebuildable from JSON

**Scale/Scope**:
- 5-15 concurrent users per team repository
- 100-200 projects, 50-100 people, 500-1000 assignments per scenario
- 5-10MB typical repository size, supports growth to 25MB
- 95% auto-merge rate (spec SC-004) - conflicts on <10% of sync operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety ✅ PASS
- All Git integration services will use strict TypeScript
- JSON import/export uses Zod schemas for runtime validation (addresses current gap)
- Existing shared types in `/shared/types/` extended for Git entities (Scenario, SyncOperation, Conflict)

### Principle II: Scenario Isolation & Audit Transparency ✅ PASS (with migration plan)
- **Current State**: Scenario tables exist (`scenarios`, `scenario_project_assignments`, etc.) - partially implements working/committed distinction
- **Migration Path**: Git branches become primary scenario storage; existing scenario tables deprecated or repurposed for cache
- **Audit Trail**: Git commit history becomes primary audit (per updated Principle II); existing `AuditService` optionally supplements for detailed field-level tracking
- **Working vs. Committed**: Local uncommitted changes = working scenario; Git repository = committed scenarios

### Principle III: Test-Driven Discipline ✅ PASS
- New Git sync services require unit tests (mock simple-git operations)
- Integration tests for JSON export/import round-trip accuracy
- E2E tests for conflict resolution user workflows
- Git conflict simulation tests (3+ users editing same assignment)
- Target: 80% coverage for new Git integration code (aligns with constitution target)

### Principle IV: Validated Inputs & Semantic Errors ⚠️ OPPORTUNITY
- **Current Gap**: Manual field filtering in controllers (e.g., `PeopleController.create`)
- **Migration Action**: Implement Zod schemas for JSON import validation (satisfies Principle IV for Git integration)
- **Recommendation**: Extend Zod validation to existing API endpoints opportunistically during migration
- **Semantic Errors**: Add `GitConflictError`, `GitAuthenticationError`, `RepositoryCorruptionError` to existing error hierarchy

### Principle V: Controller-Service Separation ✅ PASS
- Git integration follows existing pattern: `GitRepositoryService` (business logic), `GitSyncController` (HTTP endpoints)
- Services injected via existing `ServiceContainer`
- Controllers extend existing `BaseController` for error handling consistency

### Principle VI: API Design Consistency ⚠️ PARTIAL
- **Current Gap**: Inconsistent response nesting (`{ data: { data: Project } }` vs. `{ data: Project }`)
- **Migration Action**: New Git sync endpoints use standard envelope: `{ success: boolean, data?: T, error?: {...} }`
- **Recommendation**: Do NOT fix existing endpoint inconsistencies during this migration (scope creep risk)
- **New Endpoints**:
  - `POST /api/sync/pull` - Pull updates from remote
  - `POST /api/sync/push` - Publish local changes
  - `GET /api/sync/status` - Check sync state
  - `GET /api/sync/conflicts` - List unresolved conflicts
  - `POST /api/sync/resolve` - Resolve specific conflict

### Principle VII: Security by Default ✅ PASS (with authentication enhancements)
- **Current State**: JWT-based auth with tokens in localStorage (XSS vulnerability)
- **Migration Action**: Add GitHub Enterprise authentication alongside existing person-based auth
- **GitHub Credentials**: Stored encrypted in Electron secure storage (electron-store with encryption)
- **Two Auth Contexts**: Local app session (existing JWT) + GitHub repository access (new OAuth/PAT)
- **Token Refresh**: Implement transparent GitHub token refresh (FR-020)

### Principle VIII: Simplicity & Minimal Abstraction ✅ PASS
- **Simplest Git integration**: `simple-git` library (battle-tested, widely used)
- **No custom Git reimplementation**: Leverage existing Git algorithms (3-way merge)
- **JSON format**: Human-readable, diffable, standard tooling support
- **Existing patterns reused**: ServiceContainer, BaseController, React Query, ScenarioContext

### Principle IX: Git-First Collaboration ✅ PRIMARY GOAL
- **This feature implements Principle IX as defined in Constitution v1.1.0**
- Git repository is single source of truth
- SQLite becomes ephemeral cache (rebuildable from JSON)
- Users initiate sync explicitly ("Save & Sync", "Refresh")
- Git conflict resolution with domain-specific validation (over-allocation warnings)

**GATE RESULT**: ✅ ALL GATES PASS - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/001-git-sync-integration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (Git library evaluation, JSON schema design)
├── data-model.md        # Phase 1 output (entity mappings, schema versions)
├── quickstart.md        # Phase 1 output (setup guide for developers)
├── contracts/           # Phase 1 output (OpenAPI specs for new endpoints)
│   ├── sync-api.yaml    # POST /api/sync/pull, /push, /status
│   └── conflict-resolution-api.yaml  # GET /conflicts, POST /resolve
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Existing Structure Enhanced**:

```text
src/server/               # Backend (Node.js + Express)
├── api/controllers/
│   ├── GitSyncController.ts         # NEW: Sync endpoints
│   └── [existing controllers]
├── services/
│   ├── git/                          # NEW: Git integration services
│   │   ├── GitRepositoryService.ts   # Clone, pull, commit, push operations
│   │   ├── GitConflictResolver.ts    # 3-way merge algorithm
│   │   ├── GitAuthService.ts         # GitHub Enterprise OAuth/PAT management
│   │   └── ScenarioExporter.ts       # SQLite ↔ JSON transformations
│   ├── audit/
│   │   └── AuditService.ts           # ENHANCED: Git commit history integration
│   └── [existing services]
├── database/
│   ├── migrations/                   # PRESERVED: Existing 37 migrations
│   ├── AuditedDatabase.ts            # PRESERVED: Continue using for cache operations
│   └── index.ts                      # ENHANCED: Add JSON import on startup
└── middleware/
    └── gitAuth.ts                    # NEW: GitHub authentication middleware

client/src/               # Frontend (React 19)
├── components/
│   ├── sync/                         # NEW: Git sync UI components
│   │   ├── SyncStatusIndicator.tsx   # "Synced", "Pending", "Offline" indicator
│   │   ├── ConflictResolutionModal.tsx  # Side-by-side conflict view
│   │   ├── ChangeHistoryPanel.tsx    # Git commit history viewer
│   │   └── ScenarioBranchSelector.tsx   # Branch switcher UI
│   └── [existing components]
├── contexts/
│   ├── ScenarioContext.tsx           # ENHANCED: Add Git sync state
│   ├── GitSyncContext.tsx            # NEW: Sync status, pending changes
│   └── [existing contexts]
├── hooks/
│   ├── useGitSync.ts                 # NEW: Sync operations hook
│   └── [existing hooks]
└── services/
    └── api-client.ts                 # ENHANCED: Add sync endpoints

shared/types/             # Shared TypeScript types
├── git-entities.ts                   # NEW: Scenario, SyncOperation, Conflict
├── json-schemas.ts                   # NEW: Zod schemas for validation
└── [existing types]

src/electron/             # Electron main process
├── main-with-setup.cjs               # ENHANCED: Add Git repo initialization
├── setup-wizard-main.cjs             # ENHANCED: Add GitHub credentials setup
└── [existing files]

tests/
├── e2e/
│   └── suites/
│       └── git-sync/                 # NEW: E2E tests for sync workflows
│           ├── first-time-setup.spec.ts
│           ├── conflict-resolution.spec.ts
│           └── offline-sync.spec.ts
└── unit/
    └── services/git/                 # NEW: Unit tests for Git services
        ├── GitRepositoryService.test.ts
        ├── ScenarioExporter.test.ts
        └── GitConflictResolver.test.ts
```

**Structure Decision**: Preserve existing Electron + React + Express architecture (Option 2: Web application). Add Git integration as new service layer under `src/server/services/git/`. SQLite database structure remains unchanged but repurposed as cache. Git repository clone stored alongside SQLite database in Electron userData directory.

## Migration Strategy

### Phase M0: Pre-Migration Assessment (Before Phase 0)

**Objective**: Understand current data and prepare for migration

**Tasks**:
1. **Inventory Current Data**:
   - Count scenarios in production databases (via `scenarios` table)
   - Measure database file sizes across user machines
   - Identify largest datasets (projects, people, assignments counts)
   - Document custom configurations (setup wizard settings)

2. **Backup Strategy**:
   - Document current backup mechanism (`index.ts` `backupDatabase()`)
   - Create pre-migration backup SOP for users
   - Test database backup/restore procedures

3. **User Communication**:
   - Draft migration announcement (benefits, timeline, risks)
   - Identify pilot users for phased rollout (1-2 users first)
   - Schedule training sessions on "Save & Sync" workflow

4. **Environment Preparation**:
   - Verify GitHub Enterprise access for all users
   - Create initial team repository: `yourorg/capacinator-data`
   - Set repository permissions (all team members: read/write)
   - Test GitHub OAuth App registration (or document PAT generation)

**Deliverables**:
- Migration readiness report (data inventory, user list, timeline)
- GitHub repository template with directory structure
- User communication materials (migration guide, FAQ)

### Phase M1: Parallel Architecture (Coexistence Period)

**Objective**: Enable both SQLite-only mode (old) and Git-sync mode (new) to coexist

**Implementation**:
1. **Feature Flag**: `ENABLE_GIT_SYNC` environment variable (default: false)
2. **Conditional Initialization**:
   - If `ENABLE_GIT_SYNC=true`: Initialize GitRepositoryService on app start
   - If `ENABLE_GIT_SYNC=false`: Existing SQLite-only behavior (no changes)
3. **UI Indicators**:
   - Git sync mode: Show "Sync Status" indicator in top nav
   - SQLite-only mode: No sync UI elements visible

**Benefits**:
- Gradual rollout: Enable Git sync for pilot users first
- Rollback capability: Disable feature flag if issues arise
- A/B testing: Compare old vs. new workflows side-by-side

### Phase M2: Data Migration Tool

**Objective**: One-time export of existing SQLite data to initial Git repository

**Tool**: `scripts/migrate-to-git.ts`

**Workflow**:
```bash
# Run migration script
npm run migrate:to-git -- --database=capacinator-dev.db --output=../capacinator-data

# Script actions:
1. Read SQLite database (projects, people, assignments, scenarios, master data)
2. Export to JSON files (scenarios/working/*.json, master-data/*.json)
3. Create initial Git repository with exported data
4. Commit with message: "Initial migration from SQLite (DATE)"
5. Optionally push to GitHub Enterprise remote
```

**Validation**:
- Compare record counts: SQLite vs. JSON
- Round-trip test: Import JSON back to SQLite, verify data integrity
- Spot-check critical records (largest projects, assignments with complex allocations)

### Phase M3: Hybrid Sync Strategy (Transition Period)

**Objective**: Users can opt-in to Git sync without breaking existing workflows

**User Experience**:
1. **First Launch After Migration**:
   - Detect `ENABLE_GIT_SYNC=true` and no local Git repo
   - Prompt: "Enable team collaboration via GitHub? [Yes] [Later]"
   - If Yes: Run setup wizard (GitHub credentials, repository URL, initial clone)
   - If Later: Continue in SQLite-only mode

2. **Opt-In Workflow**:
   - User clicks "Enable Team Sync" button in settings
   - Setup wizard guides through GitHub authentication
   - Background: Clone repository, import JSON to SQLite cache
   - Notify: "Sync enabled. Your changes will now sync to the team repository."

3. **Dual-Mode Support**:
   - SQLite-only users: Save locally, no sync UI
   - Git-sync users: Save locally + "Sync" button appears

### Phase M4: Full Cutover (Git-First Enforcement)

**Objective**: All users on Git-sync mode, SQLite-only deprecated

**Prerequisites**:
- 100% of users successfully migrated to Git sync
- No critical bugs reported in Git sync mode
- User training completed
- Backup/recovery procedures validated

**Actions**:
1. Remove `ENABLE_GIT_SYNC` feature flag (always true)
2. Remove SQLite-only code paths
3. Update documentation: Git sync is mandatory
4. Archive old SQLite databases (keep as backup, not active)

**Timeline Recommendation**: 3-6 months after initial rollout

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No constitutional violations identified. All principles either pass or have clear migration paths aligned with existing gaps (Principle IV validation, Principle VI response consistency). Git-First architecture is explicitly mandated by Constitution v1.1.0 Principle IX.*

**Migration Complexity Justification** (not a constitutional violation, but notable complexity):

| Complexity | Why Needed | Simpler Alternative Rejected Because |
|------------|------------|-------------------------------------|
| Parallel architecture (coexistence) | Enable gradual rollout and rollback capability | Immediate cutover rejected: Too risky for production users, no fallback if Git sync has bugs |
| Dual authentication (JWT + GitHub) | Preserve existing user sessions while adding repository access | Replacing JWT with GitHub-only auth rejected: Breaks existing offline workflows, unnecessary coupling |
| SQLite cache retained | Query performance for large datasets (500+ assignments) | Git repository as direct data source rejected: Too slow for complex SQL queries (JOINs, aggregations), no indexes |
| JSON schema versioning | Support importing old data formats after schema evolution | Breaking old scenarios rejected: Users must access historical planning data indefinitely |
