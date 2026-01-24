# Tasks: Git-Based Multi-User Collaboration

**Input**: Design documents from `/specs/001-git-sync-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sync-api.yaml

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are excluded from this implementation plan.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `src/server/` at repository root
- **Frontend**: `client/src/` at repository root
- **Shared**: `shared/types/` at repository root
- **Electron**: `src/electron/` at repository root
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and basic structure for Git integration

- [X] T001 Install Git integration dependencies: `simple-git@^3.0.0`, `zod@^3.25.0`, `electron-store@^10.0.0`, `diff@^5.0.0` via npm
- [X] T002 Create Git services directory structure: `src/server/services/git/`
- [X] T003 Create sync UI components directory structure: `client/src/components/sync/`
- [X] T004 [P] Add Git sync environment variables to `.env.development`: `ENABLE_GIT_SYNC`, `GITHUB_ENTERPRISE_URL`, `GIT_REPOSITORY_URL`, `GIT_SYNC_AUTO_PULL_ON_STARTUP`
- [X] T005 [P] Create shared types file for Git entities in `shared/types/git-entities.ts`
- [X] T006 [P] Create JSON schema definitions file in `shared/types/json-schemas.ts` with Zod validators

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement GitCredential storage in Electron secure store at `src/electron/credential-store.ts` using electron-store with encryption
- [X] T008 [P] Create GitAuthService in `src/server/services/git/GitAuthService.ts` for GitHub Enterprise authentication (PAT/OAuth token management)
- [X] T009 [P] Create base GitRepositoryService class in `src/server/services/git/GitRepositoryService.ts` with simple-git initialization
- [X] T010 [P] Create ScenarioExporter base class in `src/server/services/git/ScenarioExporter.ts` for SQLite ↔ JSON transformations
- [X] T011 [P] Add GitHub authentication middleware in `src/server/middleware/gitAuth.ts` for API route protection
- [X] T012 Create SyncOperation temporary table migration in `src/server/database/migrations/` for tracking sync state
- [X] T013 Create Conflict temporary table migration in `src/server/database/migrations/` for storing unresolved conflicts
- [X] T014 [P] Create GitSyncContext in `client/src/contexts/GitSyncContext.tsx` for React state management (sync status, pending changes)
- [X] T015 [P] Add sync API endpoints to api-client in `client/src/lib/api-client.ts` (status, pull, push, conflicts)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - First-Time Setup and Basic Sync (Priority: P1) 🎯 MVP

**Goal**: Enable users to connect to GitHub Enterprise repository, download scenario data, make changes, and sync them back to the shared repository

**Independent Test**: Connect to a test GitHub Enterprise repository, clone existing scenario data, view it in the application dashboard, modify a project name, click "Save & Sync", verify change appears in GitHub repository commits, have another user click "Refresh" and see the updated project name

### Implementation for User Story 1

**Backend Services**

- [X] T016 [P] [US1] Implement GitRepositoryService.initialize() method in `src/server/services/git/GitRepositoryService.ts` for checking existing repo and setting branch
- [X] T017 [P] [US1] Implement GitRepositoryService.clone() method in `src/server/services/git/GitRepositoryService.ts` with shallow clone (`--depth 1`)
- [X] T018 [P] [US1] Implement GitRepositoryService.pull() method in `src/server/services/git/GitRepositoryService.ts` with merge strategy (no rebase)
- [X] T019 [P] [US1] Implement GitRepositoryService.commit() method in `src/server/services/git/GitRepositoryService.ts` with author attribution
- [X] T020 [P] [US1] Implement GitRepositoryService.push() method in `src/server/services/git/GitRepositoryService.ts` with credential authentication
- [X] T021 [P] [US1] Implement ScenarioExporter.exportToJSON() method in `src/server/services/git/ScenarioExporter.ts` for projects, people, assignments, phases
- [X] T022 [P] [US1] Implement ScenarioExporter.importFromJSON() method in `src/server/services/git/ScenarioExporter.ts` with Zod validation
- [X] T023 [US1] Add JSON schema validation in ScenarioExporter using Zod schemas from `shared/types/json-schemas.ts`
- [X] T024 [US1] Implement automatic commit message generation in `src/server/services/git/ScenarioExporter.ts` based on changed entities

**API Endpoints**

- [X] T025 [P] [US1] Create GitSyncController in `src/server/api/controllers/GitSyncController.ts` extending BaseController
- [X] T026 [P] [US1] Implement GET /api/sync/status endpoint in GitSyncController for checking sync state
- [X] T027 [P] [US1] Implement POST /api/sync/pull endpoint in GitSyncController for pulling remote changes
- [X] T028 [P] [US1] Implement POST /api/sync/push endpoint in GitSyncController for publishing local changes
- [X] T029 [US1] Create sync routes file in `src/server/api/routes/sync.ts` registering GitSyncController endpoints
- [X] T030 [US1] Register sync routes in `src/server/index.ts` at `/api/sync` path

**Frontend Components**

- [X] T031 [P] [US1] Create SyncStatusIndicator component in `client/src/components/sync/SyncStatusIndicator.tsx` showing "Synced", "Pending", "Syncing", "Offline"
- [X] T032 [P] [US1] Create SyncButton component in `client/src/components/sync/SyncButton.tsx` for "Save & Sync" action
- [X] T033 [P] [US1] Create useGitSync hook in `client/src/hooks/useGitSync.ts` wrapping GitSyncContext operations
- [X] T034 [US1] Integrate SyncStatusIndicator into application top navigation bar
- [X] T035 [US1] Integrate SyncButton into scenario editing pages (Projects, People, Assignments)
- [X] T036 [US1] Implement GitSyncProvider logic in GitSyncContext for status updates and sync operations

**Electron Integration**

- [X] T037 [P] [US1] Add Git repository initialization to Electron main process in `src/electron/main-with-setup.cjs` on app startup
- [X] T038 [P] [US1] Enhance setup wizard in `src/electron/setup-wizard-main.cjs` to collect GitHub Enterprise credentials
- [X] T039 [US1] Implement automatic SQLite cache rebuild from JSON on app startup in `src/server/database/index.ts`
- [X] T040 [US1] Add feature flag check (`ENABLE_GIT_SYNC`) in Electron startup to conditionally enable Git sync mode

**Offline Support**

- [X] T041 [P] [US1] Implement offline detection in GitSyncContext using navigator.onLine events
- [X] T042 [P] [US1] Create offline queue service in `src/server/services/git/OfflineQueueService.ts` for pending sync operations
- [X] T043 [US1] Add automatic sync retry when connectivity returns in OfflineQueueService
- [X] T044 [US1] Update SyncStatusIndicator to show "Pending Sync" when offline with queued changes

**Checkpoint**: At this point, User Story 1 should be fully functional - users can clone repository, view data, make changes, sync them, and work offline

---

## Phase 4: User Story 2 - Conflict Detection and Resolution (Priority: P2)

**Goal**: Detect when local changes conflict with remote changes, display both versions side-by-side, and allow users to resolve conflicts intelligently with domain validation (over-allocation warnings)

**Independent Test**: Simulate two users editing the same project simultaneously - User A changes project name to "Alpha Project", User B changes same project name to "Beta Project" at the same time. When either syncs, application should detect conflict and present both versions. User selects preferred version, completes sync, and other user sees resolved state on next refresh.

### Implementation for User Story 2

**Backend Services**

- [X] T045 [P] [US2] Create GitConflictResolver service in `src/server/services/git/GitConflictResolver.ts` implementing 3-way merge algorithm
- [X] T046 [P] [US2] Implement GitConflictResolver.detectConflicts() method using diff library for BASE/LOCAL/REMOTE comparison
- [X] T047 [P] [US2] Implement auto-merge logic in GitConflictResolver for non-overlapping field changes
- [X] T048 [US2] Add conflict detection to GitRepositoryService.pull() method, invoke GitConflictResolver when conflicts detected
- [X] T049 [US2] Implement domain validation service in `src/server/services/git/ConflictValidator.ts` for over-allocation warnings
- [X] T050 [US2] Add over-allocation calculation in ConflictValidator for assignment conflicts (check if person exceeds 100% in timeframe)

**API Endpoints**

- [X] T051 [P] [US2] Implement GET /api/sync/conflicts endpoint in GitSyncController for listing unresolved conflicts
- [X] T052 [P] [US2] Implement POST /api/sync/conflicts/:id/resolve endpoint in GitSyncController for applying user resolution
- [X] T053 [US2] Update POST /api/sync/pull endpoint to return conflicts array when detected
- [X] T054 [US2] Add conflict resolution options validation (accept_local, accept_remote, custom) in GitSyncController

**Frontend Components**

- [X] T055 [P] [US2] Create ConflictResolutionModal component in `client/src/components/sync/ConflictResolutionModal.tsx` with side-by-side comparison view
- [X] T056 [P] [US2] Create ConflictListItem component in `client/src/components/sync/ConflictListItem.tsx` displaying entity type, conflicting field, and values
- [X] T057 [P] [US2] Add conflict state management to GitSyncContext (conflicts array, resolution functions)
- [X] T058 [US2] Implement conflict resolution UI workflow: show modal when conflicts detected after pull
- [X] T059 [US2] Add "Resolve Later" option in ConflictResolutionModal allowing partial sync completion
- [X] T060 [US2] Display over-allocation warnings in ConflictResolutionModal for assignment conflicts (yellow warning badge)

**Integration**

- [X] T061 [US2] Update SyncStatusIndicator to show "Conflict Detected" state with conflict count badge
- [X] T062 [US2] Integrate conflict detection into push workflow: prevent push if unresolved conflicts exist
- [X] T063 [US2] Persist unresolved conflicts to Conflict table for later resolution
- [X] T064 [US2] Clear resolved conflicts from Conflict table after successful sync

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can sync and resolve conflicts when concurrent edits occur

---

## Phase 5: User Story 3 - Scenario Branching and Version History (Priority: P3)

**Goal**: Enable users to create experimental "what-if" scenario branches, compare branches side-by-side, view complete change history, and merge approved scenarios back to main

**Independent Test**: From committed scenario with 10 projects, create new branch "Q1-Optimistic", add 5 new projects, compare branch to main showing differences, view change history for one project showing who created it and when, merge branch back to main (if no conflicts), verify main scenario now has all 15 projects

### Implementation for User Story 3

**Backend Services**

- [X] T065 [P] [US3] Implement GitRepositoryService.createBranch() method in `src/server/services/git/GitRepositoryService.ts` for scenario branching
- [X] T066 [P] [US3] Implement GitRepositoryService.checkoutBranch() method in `src/server/services/git/GitRepositoryService.ts` for switching scenarios
- [X] T067 [P] [US3] Implement GitRepositoryService.listBranches() method in `src/server/services/git/GitRepositoryService.ts` returning all scenario branches
- [X] T068 [P] [US3] Implement GitRepositoryService.mergeBranch() method in `src/server/services/git/GitRepositoryService.ts` with conflict detection
- [X] T069 [P] [US3] Create BranchMetadataService in `src/server/services/git/BranchMetadataService.ts` for reading/writing `scenarios/branches.json`
- [X] T070 [P] [US3] Implement GitRepositoryService.getHistory() method in `src/server/services/git/GitRepositoryService.ts` for commit log retrieval
- [X] T071 [US3] Create ChangeHistoryParser service in `src/server/services/git/ChangeHistoryParser.ts` for parsing Git diffs into entity changes
- [X] T072 [US3] Implement ScenarioComparator service in `src/server/services/git/ScenarioComparator.ts` for diff calculation between branches

**API Endpoints**

- [X] T073 [P] [US3] Implement POST /api/sync/branches endpoint in GitSyncController for creating scenario branches
- [X] T074 [P] [US3] Implement GET /api/sync/branches endpoint in GitSyncController for listing all branches
- [X] T075 [P] [US3] Implement POST /api/sync/branches/:name/checkout endpoint in GitSyncController for switching scenarios
- [X] T076 [P] [US3] Implement POST /api/sync/branches/:name/merge endpoint in GitSyncController for merging scenarios
- [X] T077 [P] [US3] Implement GET /api/sync/history endpoint in GitSyncController with filtering by entity type/ID
- [X] T078 [P] [US3] Implement GET /api/sync/compare endpoint in GitSyncController for branch comparison (query params: base, target)

**Frontend Components**

- [X] T079 [P] [US3] Create ScenarioBranchSelector component in `client/src/components/sync/ScenarioBranchSelector.tsx` dropdown for switching branches
- [X] T080 [P] [US3] Create CreateBranchModal component in `client/src/components/sync/CreateBranchModal.tsx` with name and description fields
- [X] T081 [P] [US3] Create ChangeHistoryPanel component in `client/src/components/sync/ChangeHistoryPanel.tsx` displaying commit log as timeline
- [X] T082 [P] [US3] Create ScenarioComparisonView component in `client/src/components/sync/ScenarioComparisonView.tsx` showing side-by-side differences
- [X] T083 [US3] Add branch management to GitSyncContext (current branch, branch list, switch/create/merge operations)
- [X] T084 [US3] Integrate ScenarioBranchSelector into application top navigation next to SyncStatusIndicator
- [X] T085 [US3] Add "Create Scenario Branch" button to scenario management page
- [X] T086 [US3] Add "Compare to Main Scenario" button when viewing non-main branch
- [X] T087 [US3] Add "View Change History" button to entity detail pages (projects, people, assignments)

**Integration**

- [X] T088 [US3] Update ScenarioContext to track current Git branch name
- [X] T089 [US3] Rebuild SQLite cache when switching branches in Electron main process
- [X] T090 [US3] Display merge conflicts when merging scenario branches, reuse ConflictResolutionModal from User Story 2
- [X] T091 [US3] Persist branch metadata to `scenarios/branches.json` on branch creation
- [X] T092 [US3] Update sync operations to respect current branch (pull/push from/to correct branch)

**Checkpoint**: All user stories should now be independently functional - users can sync, resolve conflicts, create scenario branches, and view history

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, performance optimization, error handling enhancements

- [ ] T093 [P] Add comprehensive error handling to all Git operations with user-friendly error messages
- [ ] T094 [P] Implement performance optimization: bulk insert with batch size 100 in ScenarioExporter.importFromJSON()
- [ ] T095 [P] Add Git operation progress indicators for long-running operations (initial clone, large pulls)
- [ ] T096 [P] Implement token refresh logic in GitAuthService for expired GitHub credentials
- [ ] T097 [P] Add validation for corrupted JSON files during import with partial recovery
- [ ] T098 [P] Create migration script in `scripts/migrate-to-git.ts` for one-time SQLite → Git export
- [ ] T099 Add logging for all Git sync operations using existing AuditService integration
- [ ] T100 Update AuditService in `src/server/services/audit/AuditService.ts` to optionally supplement Git commit history
- [ ] T101 [P] Add network connectivity tests and graceful degradation when GitHub Enterprise unavailable
- [ ] T102 [P] Implement disk space check before Git operations (warn if < 500MB free)
- [ ] T103 Create setup guide documentation in `docs/git-sync-setup.md` for administrators
- [ ] T104 [P] Add telemetry for sync operation timing (clone, pull, push, conflict resolution)
- [ ] T105 Validate quickstart.md instructions by executing setup steps on clean environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Integrates with US1 but independently testable
  - User Story 3 (P3): Can start after Foundational - Integrates with US1/US2 but independently testable
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

**User Story 1 (P1)**: Foundation for all Git sync functionality
- Required for: US2 (needs basic sync to detect conflicts), US3 (needs basic sync for branching)
- Can be deployed as MVP independently

**User Story 2 (P2)**: Conflict resolution on top of basic sync
- Depends on: US1 sync infrastructure (GitRepositoryService, ScenarioExporter)
- Adds: Conflict detection and resolution UI
- Can be tested independently by simulating concurrent edits

**User Story 3 (P3)**: Advanced version control features
- Depends on: US1 sync infrastructure, US2 conflict resolution (for branch merging)
- Adds: Branching, history, comparison capabilities
- Can be tested independently by creating branches and viewing history

### Within Each User Story

**User Story 1**:
1. Backend services (T016-T024) → API endpoints (T025-T030) → Frontend (T031-T036) → Electron integration (T037-T040) → Offline support (T041-T044)
2. Services can be built in parallel ([P] tasks)
3. API endpoints depend on services being complete
4. Frontend depends on API endpoints being available

**User Story 2**:
1. Backend services (T045-T050) → API endpoints (T051-T054) → Frontend (T055-T060) → Integration (T061-T064)
2. Conflict detection services can be built in parallel
3. UI components can be built in parallel once API available

**User Story 3**:
1. Backend services (T065-T072) → API endpoints (T073-T078) → Frontend (T079-T087) → Integration (T088-T092)
2. Branch operations and history parsing can be built in parallel
3. UI components can be built in parallel once API available

### Parallel Opportunities

- **Phase 1 Setup**: T004, T005, T006 can run in parallel (different files)
- **Phase 2 Foundational**: T008, T009, T010, T011, T014, T015 can run in parallel (independent services)
- **Within US1 Backend**: T016-T020 (GitRepositoryService methods), T021-T022 (ScenarioExporter methods) can run in parallel
- **Within US1 API**: T025-T028 (controller endpoints) can run in parallel
- **Within US1 Frontend**: T031-T033 (components and hook) can run in parallel
- **Within US2 Backend**: T045-T047 (conflict resolver methods), T049-T050 (validation) can run in parallel
- **Within US2 Frontend**: T055-T057 (modal components and state) can run in parallel
- **Within US3 Backend**: T065-T072 (all Git operations and parsers) can run in parallel
- **Within US3 API**: T073-T078 (all endpoints) can run in parallel
- **Within US3 Frontend**: T079-T082 (all UI components) can run in parallel
- **Polish Phase**: T093-T105 (most tasks independent) can run in parallel

---

## Parallel Example: User Story 1 Backend Services

```bash
# Launch all GitRepositoryService methods together:
Task T016: "Implement GitRepositoryService.initialize()"
Task T017: "Implement GitRepositoryService.clone()"
Task T018: "Implement GitRepositoryService.pull()"
Task T019: "Implement GitRepositoryService.commit()"
Task T020: "Implement GitRepositoryService.push()"

# Launch all ScenarioExporter methods together:
Task T021: "Implement ScenarioExporter.exportToJSON()"
Task T022: "Implement ScenarioExporter.importFromJSON()"

# Launch API endpoints together (after services complete):
Task T025: "Create GitSyncController"
Task T026: "Implement GET /api/sync/status"
Task T027: "Implement POST /api/sync/pull"
Task T028: "Implement POST /api/sync/push"
```

---

## Parallel Example: User Story 2 Backend Services

```bash
# Launch all GitConflictResolver methods together:
Task T045: "Create GitConflictResolver service"
Task T046: "Implement GitConflictResolver.detectConflicts()"
Task T047: "Implement auto-merge logic"

# Launch validation services in parallel:
Task T049: "Implement domain validation service ConflictValidator"
Task T050: "Add over-allocation calculation"
```

---

## Parallel Example: User Story 3 Components

```bash
# Launch all frontend components together:
Task T079: "Create ScenarioBranchSelector component"
Task T080: "Create CreateBranchModal component"
Task T081: "Create ChangeHistoryPanel component"
Task T082: "Create ScenarioComparisonView component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~6 tasks, ~2-3 hours)
2. Complete Phase 2: Foundational (~9 tasks, ~1 day) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (~29 tasks, ~3-4 days)
4. **STOP and VALIDATE**: Test User Story 1 independently with quickstart.md
5. Deploy/demo to pilot users if ready

**MVP Deliverable**: Users can connect to GitHub Enterprise, clone scenario data, make changes, sync them, and work offline. No conflict resolution yet (users coordinate manually), no branching (single main scenario only).

### Incremental Delivery

1. **Foundation**: Setup + Foundational → ~1.5 days → Git infrastructure ready
2. **US1 (MVP)**: Basic sync → ~3-4 days → Test independently → Deploy (MVP!)
3. **US2**: Conflict resolution → ~2-3 days → Test independently → Deploy (Enhanced collaboration)
4. **US3**: Branching & history → ~3-4 days → Test independently → Deploy (Full version control)
5. **Polish**: Cross-cutting improvements → ~1-2 days → Final release

**Total Estimated Duration**: 11-15 days for complete feature (all 3 user stories + polish)

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. **Team completes Setup + Foundational together** (~1.5 days)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T016-T044) - Basic sync
   - **Developer B**: User Story 2 (T045-T064) - Conflict resolution (waits for US1 services)
   - **Developer C**: User Story 3 (T065-T092) - Branching (waits for US1 services)
3. **Stories complete and integrate independently**
4. **Team collaborates on Polish phase**

**Accelerated Timeline**: ~6-8 days with 3 developers working in parallel

---

## Notes

- [P] tasks = different files, no dependencies within same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group (e.g., all methods in one service)
- Stop at any checkpoint to validate story independently
- Feature flag (`ENABLE_GIT_SYNC`) allows gradual rollout and rollback capability
- All Git operations must handle errors gracefully (offline, authentication failures, conflicts)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
