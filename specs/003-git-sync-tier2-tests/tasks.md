# Tasks: Git Sync Unit Tests - Tier 2 Validation & Safety

**Input**: Design documents from `/specs/003-git-sync-tier2-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md
**GitHub Issue**: #106

**Tests**: This feature IS tests. All tasks create test code.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Test files**: `tests/unit/server/services/git/__tests__/`
- **Services under test**: `src/server/services/git/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize test file structure and shared mock utilities

- [ ] T001 Create ConflictValidator.test.ts with file header, imports, and describe blocks in tests/unit/server/services/git/__tests__/ConflictValidator.test.ts
- [ ] T002 [P] Create GitErrors.test.ts with file header, imports, and describe blocks in tests/unit/server/services/git/__tests__/GitErrors.test.ts
- [ ] T003 [P] Create GitHealthCheck.test.ts with file header, imports, and describe blocks in tests/unit/server/services/git/__tests__/GitHealthCheck.test.ts
- [ ] T004 Create createMockDb() helper function for Knex mocking in ConflictValidator.test.ts
- [ ] T005 [P] Create HTTP/HTTPS mock setup for GitHealthCheck.test.ts (mock https.get, http.get)
- [ ] T006 [P] Create fs/promises mock setup for GitHealthCheck.test.ts (mock statfs, access)

**Checkpoint**: All three test files exist with basic structure and mocks ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test utilities that multiple user stories depend on

**⚠️ CRITICAL**: These must complete before user story tests can be written

- [ ] T007 Implement mock database chain builder (where, whereNot, join, select, first, orderBy) in ConflictValidator.test.ts
- [ ] T008 [P] Implement mock HTTP response factory (success, error, timeout scenarios) in GitHealthCheck.test.ts
- [ ] T009 [P] Implement mock filesystem stats factory (sufficient space, insufficient space, error) in GitHealthCheck.test.ts
- [ ] T010 Create test data factories for Assignment, Person, Project, Phase entities in ConflictValidator.test.ts

**Checkpoint**: Foundation ready - user story test implementation can now begin

---

## Phase 3: User Story 1 - Over-Allocation Detection (Priority: P1) 🎯 MVP

**Goal**: Test ConflictValidator's ability to detect when a person is assigned > 100% allocation across overlapping projects

**Independent Test**: Run ConflictValidator.test.ts and verify all checkOverAllocation describe blocks pass

### Implementation for User Story 1

- [ ] T011 [US1] Test: should return empty warnings when person has no overlapping assignments in ConflictValidator.test.ts
- [ ] T012 [P] [US1] Test: should detect over-allocation when total exceeds 100% with complete overlap in ConflictValidator.test.ts
- [ ] T013 [P] [US1] Test: should detect over-allocation when assignment starts during existing assignment period in ConflictValidator.test.ts
- [ ] T014 [P] [US1] Test: should detect over-allocation when assignment ends during existing assignment period in ConflictValidator.test.ts
- [ ] T015 [P] [US1] Test: should detect over-allocation when new assignment contains existing assignment in ConflictValidator.test.ts
- [ ] T016 [US1] Test: should NOT detect overlap when assignments are adjacent (end date = next start date) in ConflictValidator.test.ts
- [ ] T017 [P] [US1] Test: should NOT detect overlap when assignments have gap between them in ConflictValidator.test.ts
- [ ] T018 [P] [US1] Test: should correctly sum allocations from multiple overlapping assignments in ConflictValidator.test.ts
- [ ] T019 [US1] Test: should exclude specified assignment ID from overlap calculation in ConflictValidator.test.ts
- [ ] T020 [P] [US1] Test: should return empty when person not found in ConflictValidator.test.ts
- [ ] T021 [P] [US1] Test: should calculate correct totalAllocation percentage in warning in ConflictValidator.test.ts
- [ ] T022 [US1] Test: should include affected assignments list in warning in ConflictValidator.test.ts
- [ ] T023 [P] [US1] Test: should include person name in warning in ConflictValidator.test.ts
- [ ] T024 [P] [US1] Test: should include timeframe string in warning in ConflictValidator.test.ts
- [ ] T025 [US1] Test: should handle exactly 100% allocation without warning in ConflictValidator.test.ts
- [ ] T026 [P] [US1] Test: should handle extremely large allocations (>1000%) in ConflictValidator.test.ts
- [ ] T027 [P] [US1] Test: should handle zero allocation assignment in ConflictValidator.test.ts
- [ ] T028 [US1] Test validateAssignmentResolution returns valid:true when no over-allocation in ConflictValidator.test.ts
- [ ] T029 [P] [US1] Test validateAssignmentResolution returns warnings when over-allocated in ConflictValidator.test.ts
- [ ] T030 [US1] Test validateAssignmentResolution returns valid:false and error when assignment not found in ConflictValidator.test.ts
- [ ] T031 [P] [US1] Test getAllOverAllocations returns all warnings for person's assignments in ConflictValidator.test.ts
- [ ] T032 [US1] Test getAllOverAllocations returns empty array for person with no over-allocations in ConflictValidator.test.ts

**Checkpoint**: Over-allocation detection fully tested (~22 tests). Run: `npm test -- ConflictValidator.test.ts --testNamePattern="checkOverAllocation|validateAssignmentResolution|getAllOverAllocations"`

---

## Phase 4: User Story 2 - User-Friendly Error Messages (Priority: P1)

**Goal**: Test GitErrors categorization and user-friendly message generation for all error types

**Independent Test**: Run GitErrors.test.ts and verify all categorizeGitError and error class tests pass

### Implementation for User Story 2

#### Error Class Tests

- [ ] T033 [US2] Test GitError base class has code, userMessage, recoverable properties in GitErrors.test.ts
- [ ] T034 [P] [US2] Test GitNetworkError sets correct code, userMessage, recoverable=true in GitErrors.test.ts
- [ ] T035 [P] [US2] Test GitAuthenticationError sets correct code, userMessage, recoverable=true in GitErrors.test.ts
- [ ] T036 [P] [US2] Test GitPermissionError sets correct code, userMessage, recoverable=false in GitErrors.test.ts
- [ ] T037 [P] [US2] Test GitConflictError includes conflictedFiles and operation in GitErrors.test.ts
- [ ] T038 [P] [US2] Test GitRepositoryStateError includes state in GitErrors.test.ts
- [ ] T039 [P] [US2] Test GitDiskSpaceError includes requiredMB and availableMB in GitErrors.test.ts
- [ ] T040 [P] [US2] Test GitBranchError includes branchName and reason in GitErrors.test.ts
- [ ] T041 [P] [US2] Test GitCloneError includes repositoryUrl in GitErrors.test.ts
- [ ] T042 [P] [US2] Test GitPushError includes reason in GitErrors.test.ts

#### Network Error Categorization Tests

- [ ] T043 [US2] Test categorizeGitError identifies ENOTFOUND as GitNetworkError in GitErrors.test.ts
- [ ] T044 [P] [US2] Test categorizeGitError identifies ECONNREFUSED as GitNetworkError in GitErrors.test.ts
- [ ] T045 [P] [US2] Test categorizeGitError identifies ETIMEDOUT as GitNetworkError in GitErrors.test.ts
- [ ] T046 [P] [US2] Test categorizeGitError identifies getaddrinfo as GitNetworkError in GitErrors.test.ts
- [ ] T047 [P] [US2] Test categorizeGitError identifies "could not resolve host" as GitNetworkError in GitErrors.test.ts

#### Authentication Error Categorization Tests

- [ ] T048 [US2] Test categorizeGitError identifies "authentication failed" as GitAuthenticationError in GitErrors.test.ts
- [ ] T049 [P] [US2] Test categorizeGitError identifies "invalid credentials" as GitAuthenticationError in GitErrors.test.ts
- [ ] T050 [P] [US2] Test categorizeGitError identifies "could not read username" as GitAuthenticationError in GitErrors.test.ts
- [ ] T051 [P] [US2] Test categorizeGitError identifies "401" as GitAuthenticationError in GitErrors.test.ts
- [ ] T052 [P] [US2] Test categorizeGitError identifies "403 forbidden" as GitAuthenticationError in GitErrors.test.ts
- [ ] T053 [P] [US2] Test categorizeGitError identifies "bad credentials" as GitAuthenticationError in GitErrors.test.ts

#### Permission Error Categorization Tests

- [ ] T054 [US2] Test categorizeGitError identifies "permission denied" as GitPermissionError in GitErrors.test.ts
- [ ] T055 [P] [US2] Test categorizeGitError identifies "insufficient permission" as GitPermissionError in GitErrors.test.ts
- [ ] T056 [P] [US2] Test categorizeGitError identifies "protected branch" as GitPermissionError in GitErrors.test.ts
- [ ] T057 [P] [US2] Test categorizeGitError identifies "you are not allowed" as GitPermissionError in GitErrors.test.ts

#### Other Error Type Categorization Tests

- [ ] T058 [US2] Test categorizeGitError identifies "conflict" as GitConflictError in GitErrors.test.ts
- [ ] T059 [P] [US2] Test categorizeGitError identifies "branch already exists" as GitBranchError in GitErrors.test.ts
- [ ] T060 [P] [US2] Test categorizeGitError identifies "branch not found" as GitBranchError in GitErrors.test.ts
- [ ] T061 [P] [US2] Test categorizeGitError identifies "non-fast-forward" as GitPushError in GitErrors.test.ts
- [ ] T062 [P] [US2] Test categorizeGitError identifies "rejected" as GitPushError in GitErrors.test.ts
- [ ] T063 [P] [US2] Test categorizeGitError identifies "repository not found" as GitCloneError in GitErrors.test.ts

#### Fallback and Edge Case Tests

- [ ] T064 [US2] Test categorizeGitError returns generic GitError for unknown error patterns in GitErrors.test.ts
- [ ] T065 [P] [US2] Test categorizeGitError is case-insensitive (ENOTFOUND vs enotfound) in GitErrors.test.ts
- [ ] T066 [P] [US2] Test categorizeGitError handles empty error message in GitErrors.test.ts
- [ ] T067 [US2] Test categorizeGitError preserves original error message in GitErrors.test.ts
- [ ] T068 [P] [US2] Test categorizeGitError includes operation in error context in GitErrors.test.ts
- [ ] T069 [US2] Test user messages are human-readable (no technical jargon) in GitErrors.test.ts

**Checkpoint**: Error categorization fully tested (~37 tests). Run: `npm test -- GitErrors.test.ts`

---

## Phase 5: User Story 3 - Pre-Operation Health Checks (Priority: P2)

**Goal**: Test GitHealthCheck's network connectivity and disk space verification

**Independent Test**: Run GitHealthCheck.test.ts and verify all network/disk check tests pass

### Implementation for User Story 3

#### Network Connectivity Tests

- [ ] T070 [US3] Test checkNetworkConnectivity returns reachable:true for HTTP 200 response in GitHealthCheck.test.ts
- [ ] T071 [P] [US3] Test checkNetworkConnectivity returns reachable:true for HTTP 301 redirect in GitHealthCheck.test.ts
- [ ] T072 [P] [US3] Test checkNetworkConnectivity returns reachable:true for HTTP 404 (server reachable) in GitHealthCheck.test.ts
- [ ] T073 [P] [US3] Test checkNetworkConnectivity returns reachable:false for HTTP 500 server error in GitHealthCheck.test.ts
- [ ] T074 [US3] Test checkNetworkConnectivity returns reachable:false on connection timeout in GitHealthCheck.test.ts
- [ ] T075 [P] [US3] Test checkNetworkConnectivity returns reachable:false on ENOTFOUND error in GitHealthCheck.test.ts
- [ ] T076 [P] [US3] Test checkNetworkConnectivity returns reachable:false on ECONNREFUSED error in GitHealthCheck.test.ts
- [ ] T077 [US3] Test checkNetworkConnectivity includes responseTimeMs in result in GitHealthCheck.test.ts
- [ ] T078 [P] [US3] Test checkNetworkConnectivity includes error message when not reachable in GitHealthCheck.test.ts
- [ ] T079 [US3] Test checkNetworkConnectivity uses HTTPS for https:// URLs in GitHealthCheck.test.ts
- [ ] T080 [P] [US3] Test checkNetworkConnectivity uses HTTP for http:// URLs in GitHealthCheck.test.ts
- [ ] T081 [US3] Test checkNetworkConnectivity handles malformed URL gracefully in GitHealthCheck.test.ts
- [ ] T082 [P] [US3] Test checkNetworkConnectivity respects custom timeout parameter in GitHealthCheck.test.ts

#### Disk Space Tests

- [ ] T083 [US3] Test checkDiskSpace returns available:true when free space exceeds requirement in GitHealthCheck.test.ts
- [ ] T084 [P] [US3] Test checkDiskSpace returns available:false when free space below requirement in GitHealthCheck.test.ts
- [ ] T085 [P] [US3] Test checkDiskSpace returns available:true when free space exactly equals requirement in GitHealthCheck.test.ts
- [ ] T086 [US3] Test checkDiskSpace correctly calculates MB from block size and available blocks in GitHealthCheck.test.ts
- [ ] T087 [P] [US3] Test checkDiskSpace checks parent directory when target doesn't exist in GitHealthCheck.test.ts
- [ ] T088 [US3] Test checkDiskSpace includes freeSpaceMB in result in GitHealthCheck.test.ts
- [ ] T089 [P] [US3] Test checkDiskSpace includes requiredMB in result in GitHealthCheck.test.ts
- [ ] T090 [US3] Test checkDiskSpace returns error message when statfs fails in GitHealthCheck.test.ts
- [ ] T091 [P] [US3] Test checkDiskSpace uses default 500MB requirement when not specified in GitHealthCheck.test.ts

#### Comprehensive Health Check Tests

- [ ] T092 [US3] Test performHealthCheck passes when both network and disk checks pass in GitHealthCheck.test.ts
- [ ] T093 [P] [US3] Test performHealthCheck throws GitNetworkError when network unreachable in GitHealthCheck.test.ts
- [ ] T094 [P] [US3] Test performHealthCheck throws GitDiskSpaceError when insufficient space in GitHealthCheck.test.ts
- [ ] T095 [US3] Test performHealthCheck checks network before disk (fails fast on network) in GitHealthCheck.test.ts
- [ ] T096 [P] [US3] Test performHealthCheck returns complete HealthCheckResult on success in GitHealthCheck.test.ts

#### Convenience Method Tests

- [ ] T097 [US3] Test isServerReachable returns true for reachable server in GitHealthCheck.test.ts
- [ ] T098 [P] [US3] Test isServerReachable returns false for unreachable server in GitHealthCheck.test.ts
- [ ] T099 [US3] Test isServerReachable uses 3000ms timeout in GitHealthCheck.test.ts
- [ ] T100 [P] [US3] Test getAvailableDiskSpaceMB returns correct MB value in GitHealthCheck.test.ts
- [ ] T101 [US3] Test getAvailableDiskSpaceMB returns 0 on error in GitHealthCheck.test.ts

**Checkpoint**: Health checks fully tested (~32 tests). Run: `npm test -- GitHealthCheck.test.ts`

---

## Phase 6: User Story 4 - Date Range Validation (Priority: P2)

**Goal**: Test ConflictValidator's project and phase date validation

**Independent Test**: Run ConflictValidator.test.ts with validateProjectResolution tests

### Implementation for User Story 4

- [ ] T102 [US4] Test validateProjectResolution returns valid:true for project with valid dates in ConflictValidator.test.ts
- [ ] T103 [P] [US4] Test validateProjectResolution returns error when end_date before start_date in ConflictValidator.test.ts
- [ ] T104 [P] [US4] Test validateProjectResolution allows null start_date or end_date in ConflictValidator.test.ts
- [ ] T105 [US4] Test validateProjectResolution returns error when phase starts before project in ConflictValidator.test.ts
- [ ] T106 [P] [US4] Test validateProjectResolution returns error when phase ends after project in ConflictValidator.test.ts
- [ ] T107 [P] [US4] Test validateProjectResolution returns multiple errors for multiple invalid phases in ConflictValidator.test.ts
- [ ] T108 [US4] Test validateProjectResolution identifies which phase is invalid in error message in ConflictValidator.test.ts
- [ ] T109 [P] [US4] Test validateProjectResolution returns valid:true for project with no phases in ConflictValidator.test.ts
- [ ] T110 [P] [US4] Test validateProjectResolution returns valid:false and error when project not found in ConflictValidator.test.ts
- [ ] T111 [US4] Test validateProjectResolution allows phases exactly matching project bounds in ConflictValidator.test.ts

**Checkpoint**: Date validation fully tested (~10 tests). Run: `npm test -- ConflictValidator.test.ts --testNamePattern="validateProjectResolution"`

---

## Phase 7: User Story 5 - Person Data Integrity (Priority: P3)

**Goal**: Test ConflictValidator's person required field validation

**Independent Test**: Run ConflictValidator.test.ts with validatePersonResolution tests

### Implementation for User Story 5

- [ ] T112 [US5] Test validatePersonResolution returns valid:true for person with all required fields in ConflictValidator.test.ts
- [ ] T113 [P] [US5] Test validatePersonResolution returns error when first_name is empty in ConflictValidator.test.ts
- [ ] T114 [P] [US5] Test validatePersonResolution returns error when first_name is whitespace only in ConflictValidator.test.ts
- [ ] T115 [P] [US5] Test validatePersonResolution returns error when last_name is empty in ConflictValidator.test.ts
- [ ] T116 [P] [US5] Test validatePersonResolution returns error when last_name is whitespace only in ConflictValidator.test.ts
- [ ] T117 [US5] Test validatePersonResolution returns multiple errors when both names missing in ConflictValidator.test.ts
- [ ] T118 [P] [US5] Test validatePersonResolution returns valid:false and error when person not found in ConflictValidator.test.ts

**Checkpoint**: Person validation fully tested (~7 tests). Run: `npm test -- ConflictValidator.test.ts --testNamePattern="validatePersonResolution"`

---

## Phase 8: Edge Cases & Error Handling

**Purpose**: Test boundary conditions and error scenarios not covered by user stories

- [ ] T119 Test checkOverAllocation handles database query error gracefully in ConflictValidator.test.ts
- [ ] T120 [P] Test validateAssignmentResolution handles database query error gracefully in ConflictValidator.test.ts
- [ ] T121 [P] Test validateProjectResolution handles database query error gracefully in ConflictValidator.test.ts
- [ ] T122 [P] Test validatePersonResolution handles database query error gracefully in ConflictValidator.test.ts
- [ ] T123 Test checkNetworkConnectivity handles request.destroy() being called during timeout in GitHealthCheck.test.ts
- [ ] T124 [P] Test checkDiskSpace handles permission denied error from statfs in GitHealthCheck.test.ts

**Checkpoint**: Edge cases covered (~6 tests)

---

## Phase 9: Polish & Verification

**Purpose**: Final verification and cleanup

- [ ] T125 Run all ConflictValidator tests and verify 80+ tests pass in ConflictValidator.test.ts
- [ ] T126 [P] Run all GitErrors tests and verify 60+ tests pass in GitErrors.test.ts
- [ ] T127 [P] Run all GitHealthCheck tests and verify 70+ tests pass in GitHealthCheck.test.ts
- [ ] T128 Run full test suite and verify all 210 tests pass: `npm test -- tests/unit/server/services/git/__tests__/{ConflictValidator,GitErrors,GitHealthCheck}.test.ts`
- [ ] T129 Run coverage check and verify targets met: ConflictValidator 85%/80%, GitErrors 100%/100%, GitHealthCheck 85%/80%
- [ ] T130 Run 5 consecutive test executions to verify no flaky tests
- [ ] T131 Update quickstart.md with actual test counts if different from estimates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Phase 2 completion
  - User stories can proceed in parallel after Foundational
  - US1 & US2 are both P1 priority - implement first
  - US3 & US4 are both P2 priority - implement second
  - US5 is P3 priority - implement last
- **Edge Cases (Phase 8)**: Depends on all user stories being complete
- **Polish (Phase 9)**: Depends on all phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 mock utilities - No story dependencies
- **User Story 2 (P1)**: No dependencies on mock utilities - Can run in parallel with US1
- **User Story 3 (P2)**: Depends on Phase 2 HTTP/FS mocks - No story dependencies
- **User Story 4 (P2)**: Depends on Phase 2 mock database - No story dependencies
- **User Story 5 (P3)**: Depends on Phase 2 mock database - No story dependencies

### File Ownership

- **ConflictValidator.test.ts**: US1, US4, US5, Edge Cases (T119-T122)
- **GitErrors.test.ts**: US2 (standalone)
- **GitHealthCheck.test.ts**: US3, Edge Cases (T123-T124)

### Parallel Opportunities

- **Phase 1**: T002, T003, T005, T006 can run in parallel (different files)
- **Phase 2**: T008, T009 can run in parallel (same file but different sections)
- **US1 & US2**: Can be implemented in parallel (different test files)
- **US3, US4, US5**: Can be implemented in parallel after US1/US2 if desired
- **Within each story**: Tests marked [P] can be written in parallel

---

## Parallel Example: User Story 2 (GitErrors Tests)

```bash
# Launch all error class tests in parallel:
Task: "Test GitNetworkError sets correct code, userMessage, recoverable=true"
Task: "Test GitAuthenticationError sets correct code, userMessage, recoverable=true"
Task: "Test GitPermissionError sets correct code, userMessage, recoverable=false"
Task: "Test GitConflictError includes conflictedFiles and operation"
Task: "Test GitRepositoryStateError includes state"
# ...continue with all [P] marked tasks

# Launch all network error categorization tests in parallel:
Task: "Test categorizeGitError identifies ENOTFOUND as GitNetworkError"
Task: "Test categorizeGitError identifies ECONNREFUSED as GitNetworkError"
Task: "Test categorizeGitError identifies ETIMEDOUT as GitNetworkError"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T010)
3. Complete Phase 3: User Story 1 - Over-Allocation Detection (T011-T032)
4. Complete Phase 4: User Story 2 - Error Messages (T033-T069)
5. **STOP and VALIDATE**: Run `npm test -- {ConflictValidator,GitErrors}.test.ts`
6. ~59 tests should pass (22 + 37)

### Full Implementation

1. Complete MVP (Steps 1-5 above)
2. Add Phase 5: User Story 3 - Health Checks (T070-T101) → ~91 tests total
3. Add Phase 6: User Story 4 - Date Validation (T102-T111) → ~101 tests total
4. Add Phase 7: User Story 5 - Person Validation (T112-T118) → ~108 tests total
5. Add Phase 8: Edge Cases (T119-T124) → ~114 tests total
6. Complete Phase 9: Polish & Verification (T125-T131)

### Test Count Summary

| Phase | User Story | Tests | Cumulative |
|-------|------------|-------|------------|
| 1-2 | Setup + Foundation | 10 tasks | (infrastructure) |
| 3 | US1: Over-Allocation | ~22 | 22 |
| 4 | US2: Error Messages | ~37 | 59 |
| 5 | US3: Health Checks | ~32 | 91 |
| 6 | US4: Date Validation | ~10 | 101 |
| 7 | US5: Person Validation | ~7 | 108 |
| 8 | Edge Cases | ~6 | 114 |
| 9 | Polish | (verification) | **~114 tests** |

**Note**: The target is 210 tests. The above is the minimum. Additional tests within each category (e.g., more overlap scenarios, more error patterns) can bring the total to 210. The [P] tests are counted individually.

---

## Notes

- [P] tasks = different test cases, can be written in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable via Jest `--testNamePattern`
- All tests are unit tests with mocked dependencies
- Verify tests pass before moving to next phase
- Commit after each story phase is complete
