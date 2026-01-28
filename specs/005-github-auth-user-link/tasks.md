# Tasks: GitHub Authentication and User Association

**Input**: Design documents from `/specs/005-github-auth-user-link/`
**Prerequisites**: plan.md (tech stack), spec.md (user stories), research.md (decisions), data-model.md (schema), contracts/ (API specs)

**Tests**: Tests are NOT explicitly requested in the feature specification, so test tasks are omitted. Tests can be added later following TDD approach if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `src/server/`
- Frontend: `client/src/`
- Shared: `shared/types/`
- Tests: `tests/`
- Migrations: `src/server/database/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [X] T001 Install dependencies: simple-oauth2, @octokit/rest, @octokit/plugin-retry, @octokit/plugin-throttling
- [X] T002 [P] Create TypeScript types in shared/types/github.ts (GitHubConnection, GitHubAssociation, OAuthState interfaces)
- [X] T003 [P] Generate encryption key and update .env.example with GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL, ENCRYPTION_KEY

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create database migration 049_create_github_connections.ts in src/server/database/migrations/ (renumbered from 047)
- [X] T005 [P] Create database migration 050_create_github_account_associations.ts in src/server/database/migrations/ (renumbered from 048)
- [X] T006 [P] Create database migration 051_add_github_to_people.ts in src/server/database/migrations/ (renumbered from 049)
- [X] T007 Run migrations: npm run db:migrate
- [X] T008 Implement EncryptionService in src/server/services/EncryptionService.ts (AES-256-GCM encryption/decryption)
- [X] T009 [P] Implement GitHubConnectionService skeleton in src/server/services/GitHubConnectionService.ts (basic CRUD, no OAuth/PAT yet)
- [X] T010 [P] Implement GitHubAssociationService skeleton in src/server/services/GitHubAssociationService.ts (basic association CRUD)
- [X] T011 Create GitHubConnectionController extending BaseController in src/server/api/controllers/GitHubConnectionController.ts
- [X] T012 [P] Create route definitions in src/server/api/routes/github-connections.ts (mount under /api/github-connections)
- [X] T013 Register github-connections routes in main Express app

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Connect GitHub Account via OAuth (Priority: P1) 🎯 MVP

**Goal**: Enable users to securely connect their GitHub account via OAuth 2.0 flow

**Independent Test**: User clicks "Connect GitHub" in profile, completes OAuth flow on GitHub, returns to Capacinator with account connected and visible in connection list

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement GitHubOAuthService in src/server/services/GitHubOAuthService.ts (OAuth flow with simple-oauth2)
- [X] T015 [P] [US1] Implement OAuth state validation middleware in src/server/middleware/github-oauth-state.ts
- [X] T016 [US1] Add OAuth initiation endpoint POST /api/github-connections/oauth/authorize in GitHubConnectionController (generate state, open browser)
- [X] T017 [US1] Add OAuth callback endpoint GET /api/github-connections/oauth/callback in GitHubConnectionController (exchange code for token)
- [X] T018 [US1] Implement token storage logic in GitHubConnectionService (encrypt and save to github_connections table)
- [X] T019 [US1] Implement automatic email-based association in GitHubAssociationService (match GitHub emails to people resources)
- [X] T020 [P] [US1] Create GitHubConnectionManager component in client/src/components/GitHubConnectionManager.tsx (list connections UI)
- [X] T021 [P] [US1] Create useGitHubConnections hook in client/src/hooks/useGitHubConnections.ts (React Query for connections)
- [X] T022 [US1] Add "Connect GitHub Account" button to GitHubConnectionManager (triggers OAuth flow)
- [X] T023 [US1] Create GitHubOAuthCallback component in client/src/components/GitHubOAuthCallback.tsx (handle OAuth redirect)
- [X] T024 [US1] Add github-api client wrapper in client/src/lib/api-client.ts (API calls to /api/github-connections)
- [X] T025 [US1] Modify Settings.tsx to include GitHubConnectionManager component in client/src/pages/Settings.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can connect GitHub via OAuth and see their connection

---

## Phase 4: User Story 2 - Connect GitHub via Personal Access Token (Priority: P2)

**Goal**: Enable users to connect GitHub using a Personal Access Token for automation/headless scenarios

**Independent Test**: User pastes a GitHub PAT into settings, token is validated with scope check, connection appears in list and Git sync works

### Implementation for User Story 2

- [X] T026 [P] [US2] Add PAT validation logic to GitHubConnectionService using @octokit/rest (validate token, check scopes, get user info)
- [X] T027 [P] [US2] Create GitHubPATInput component in client/src/components/GitHubPATInput.tsx (PAT entry form with validation feedback)
- [X] T028 [US2] Add PAT connection endpoint POST /api/github-connections/pat in GitHubConnectionController
- [X] T029 [US2] Implement PAT storage logic in GitHubConnectionService (encrypt and save, set connection_method='pat')
- [X] T030 [US2] Add PAT connection UI to GitHubConnectionManager component (show PAT input form)
- [X] T031 [US2] Add scope validation error messages to GitHubPATInput (display missing scopes clearly)
- [X] T032 [US2] Implement token revocation detection in GitHubConnectionService (mark status='error' on API failures)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - OAuth and PAT connection methods available

---

## Phase 5: User Story 3 - Associate Multiple People Resources (Priority: P2)

**Goal**: Support linking multiple people resources to one GitHub account for proper commit attribution across teams

**Independent Test**: Create multiple people resources with same email, connect GitHub account, verify commits from that account are attributed to all matching people resources

### Implementation for User Story 3

- [X] T033 [P] [US3] Extend GitHubAssociationService with manual association methods (createAssociation, removeAssociation)
- [X] T034 [P] [US3] Create PeopleGitHubAssociations component in client/src/components/PeopleGitHubAssociations.tsx (admin UI for managing associations)
- [X] T035 [US3] Add manual association endpoint POST /api/github-connections/:id/associations in GitHubConnectionController (admin only)
- [X] T036 [US3] Add association removal endpoint DELETE /api/github-connections/:id/associations/:person_id in GitHubConnectionController (admin only)
- [X] T037 [US3] Add get associations endpoint GET /api/github-connections/:id/associations in GitHubConnectionController
- [X] T038 [US3] Implement permission check middleware for admin-only association endpoints
- [X] T039 [US3] Add association list UI to PeopleGitHubAssociations (show which people resources are linked)
- [X] T040 [US3] Add manual link/unlink controls to PeopleGitHubAssociations (admin can override auto-associations)
- [X] T041 [US3] Extend people table cache update logic (populate github_username and github_user_id when associations created)

**Checkpoint**: All user stories should now support multi-person associations - consultants can link multiple people records to one GitHub account

---

## Phase 6: User Story 4 - Manage Multiple GitHub Accounts (Priority: P3)

**Goal**: Allow users to connect multiple GitHub accounts and select which one to use for different contexts

**Independent Test**: Connect two different GitHub accounts to one user, assign each to different project contexts, verify Git sync uses correct account per context

### Implementation for User Story 4

- [X] T042 [P] [US4] Add is_default flag update endpoint PATCH /api/github-connections/:id in GitHubConnectionController
- [X] T043 [P] [US4] Implement default connection logic in GitHubConnectionService (set is_default=true, others to false)
- [X] T044 [US4] Add multiple connection support to GitHubConnectionManager (display all connections with default indicator)
- [X] T045 [US4] Add "Set as Default" button to each connection in GitHubConnectionManager
- [X] T046 [US4] Implement GitHub account uniqueness check in GitHubConnectionService (prevent duplicate github_user_id across users)
- [X] T047 [US4] Add GET /api/github-connections endpoint to list user's connections with filtering in GitHubConnectionController
- [X] T048 [US4] Add last_used_at timestamp update logic in GitHubConnectionService (track which connection was used when)
- [X] T049 [US4] Add connection status indicators to GitHubConnectionManager (active, expired, error badges)

**Checkpoint**: All user stories complete - users can manage multiple GitHub accounts with clear default selection

---

## Phase 7: GitHub API Integration & Rate Limiting

**Purpose**: Implement robust GitHub API interaction with rate limiting and retry logic

- [X] T050 [P] Configure @octokit/rest with retry and throttling plugins in GitHubConnectionService
- [X] T051 [P] Implement rate limit detection and exponential backoff in github-api service wrapper
- [X] T052 [P] Add GitHub Enterprise URL support to OAuth and PAT connection flows (optional github_base_url parameter)
- [X] T053 Add OAuth token refresh logic in GitHubConnectionService (auto-refresh 1 hour before expiry)
- [X] T054 [P] Implement GET /api/people/:id/github-activity endpoint in PeopleController (show commit activity for person)
- [X] T055 Add GitHub API error handling with user-friendly messages (rate limit, invalid token, network errors)

---

## Phase 8: Disconnection & Cleanup

**Purpose**: Enable users to disconnect GitHub accounts and clean up associations

- [X] T056 [P] Implement DELETE /api/github-connections/:id endpoint in GitHubConnectionController
- [X] T057 [P] Add cascade deletion logic in GitHubConnectionService (remove connection and all associations)
- [X] T058 Add "Disconnect" button to GitHubConnectionManager for each connection
- [X] T059 Add confirmation dialog to disconnect action (warn about losing Git sync access)
- [X] T060 [P] Add audit logging for connect/disconnect events in GitHubConnectionService

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T061 [P] Add comprehensive error handling across all GitHub connection endpoints
- [X] T062 [P] Add logging for all GitHub authentication operations (OAuth flow, PAT validation, token refresh)
- [X] T063 [P] Implement CSRF protection validation in OAuth callback (verify state parameter matches)
- [X] T064 [P] Add input validation schemas for all GitHub connection endpoints (Zod or similar)
- [X] T065 Run through quickstart.md validation scenarios (OAuth flow, PAT connection, manual testing)
- [X] T066 [P] Update UserProfile component with connection status summary
- [X] T067 [P] Add connection health check indicator (detect expired/invalid tokens)
- [X] T068 Security review: Verify no plaintext tokens in logs, database encryption working, OAuth state secure

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **GitHub API Integration (Phase 7)**: Can start after US1 completes (needs GitHubConnectionService)
- **Disconnection (Phase 8)**: Can start after US1 completes (needs connection UI)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable, extends GitHubConnectionService
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independently testable, extends GitHubAssociationService
- **User Story 4 (P3)**: Can start after US1 completes (extends connection UI) - Independently testable

### Within Each User Story

- Models/migrations before services
- Services before controllers
- Controllers before routes
- Backend before frontend
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1, 2, 3 can start in parallel (if team capacity allows)
- Frontend and backend tasks within a story marked [P] can run in parallel
- Phase 7 and Phase 8 can run in parallel (both extend existing services)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch parallel tasks together for US1:
Task T014: "Implement GitHubOAuthService in src/server/services/GitHubOAuthService.ts"
Task T015: "Implement OAuth state validation middleware in src/server/middleware/github-oauth-state.ts"
Task T020: "Create GitHubConnectionManager component in client/src/components/GitHubConnectionManager.tsx"
Task T021: "Create useGitHubConnections hook in client/src/hooks/useGitHubConnections.ts"

# Then sequential tasks that depend on above:
Task T016: "Add OAuth initiation endpoint" (depends on T014, T015)
Task T017: "Add OAuth callback endpoint" (depends on T014, T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T013) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T014-T025)
4. **STOP and VALIDATE**: Test OAuth connection flow end-to-end
5. Deploy/demo if ready - OAuth authentication working!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T013)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! OAuth working)
3. Add User Story 2 → Test independently → Deploy/Demo (PAT support added)
4. Add User Story 3 → Test independently → Deploy/Demo (Multi-person associations working)
5. Add User Story 4 → Test independently → Deploy/Demo (Multi-account support added)
6. Add Phase 7-9 → Polish and production-ready
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T013)
2. Once Foundational is done:
   - Developer A: User Story 1 (OAuth) - T014-T025
   - Developer B: User Story 2 (PAT) - T026-T032
   - Developer C: User Story 3 (Associations) - T033-T041
3. Stories complete and integrate independently
4. Developer D can start Phase 7 once US1 completes

---

## Summary

**Total Tasks**: 68
- Setup: 3 tasks
- Foundational: 10 tasks (BLOCKING)
- User Story 1 (OAuth): 12 tasks
- User Story 2 (PAT): 7 tasks
- User Story 3 (Associations): 9 tasks
- User Story 4 (Multiple Accounts): 8 tasks
- GitHub API Integration: 6 tasks
- Disconnection: 5 tasks
- Polish: 8 tasks

**Parallel Opportunities**: 29 tasks marked [P] can run in parallel

**Independent Test Criteria**:
- US1: OAuth connection visible, Git sync works with OAuth token
- US2: PAT connection visible, Git sync works with PAT, scope validation working
- US3: Multiple people resources linked to one GitHub account, commits attributed to all
- US4: Multiple GitHub accounts connected, default selection working, per-project account selection

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 25 tasks

**Recommended Order**: P1 (OAuth) → P2 (PAT) → P2 (Associations) → P3 (Multiple Accounts) → Polish

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are NOT included per specification - add test tasks if TDD approach is adopted
- Security-critical: T008 (encryption), T063 (CSRF), T068 (security review)
