# Implementation Plan: GitHub Authentication and User Association

**Branch**: `005-github-auth-user-link` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-github-auth-user-link/spec.md`

## Summary

Implement secure GitHub authentication using OAuth 2.0 and Personal Access Tokens (PAT) to enable Git sync features. Support flexible association between Capacinator users, GitHub accounts, and people resources for accurate commit attribution across projects. This feature enables the Git-First Collaboration architecture (Constitution Principle IX) by providing secure credential management for Git repository operations.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES2022 target), Node.js 20+
**Primary Dependencies**: Express (backend), React 19 (frontend), @octokit/rest (GitHub API), simple-git (Git operations)
**Storage**: SQLite (better-sqlite3) for credential storage with encryption at rest
**Testing**: Jest (unit/integration), Playwright (E2E OAuth flows)
**Target Platform**: Electron desktop app (cross-platform: Windows, macOS, Linux)
**Project Type**: Web application (React frontend + Express backend in Electron)
**Performance Goals**: OAuth flow completion < 10 seconds, token validation < 500ms, support 1000 API calls/hour per user
**Constraints**: Must encrypt tokens at rest, OAuth CSRF protection required, support GitHub Enterprise custom URLs, offline-first design
**Scale/Scope**: 100+ users, multiple GitHub accounts per user, multiple people resources per GitHub account, support for 10+ simultaneous Git sync operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety | ✅ PASS | TypeScript strict mode, explicit types for GitHub API responses, OAuth state, token structures |
| II. Scenario Isolation & Audit | ⚠️ PARTIAL | GitHub connections are user-scoped, not scenario-scoped. Audit logging required for connection/disconnection events. Git commit attribution through associations enables audit trail. |
| III. Test-Driven Discipline | ✅ PASS | E2E tests for OAuth flow, unit tests for token validation/encryption, integration tests for association logic |
| IV. Validated Inputs | ✅ PASS | Schema validation for PAT input, OAuth callback validation, GitHub API response validation |
| V. Controller-Service Separation | ✅ PASS | GitHubConnectionController + GitHubConnectionService, OAuth handled in service layer |
| VI. API Design Consistency | ✅ PASS | REST endpoints: GET/POST /api/github-connections, standard envelope responses |
| VII. Security by Default | ✅ PASS | Token encryption at rest, OAuth state validation (CSRF), permission checks for admin associations |
| VIII. Simplicity | ✅ PASS | Direct @octokit/rest integration, no custom OAuth library, standard bcrypt for token encryption |
| IX. Git-First Collaboration | ✅ PASS | **This feature enables Git-First architecture** by providing secure GitHub credentials for GitRepositoryService |

**Gate Decision**: ✅ **PASS** - All principles satisfied. Proceed to Phase 0.

**Notes**:
- Principle II partial: GitHub connections are global user settings, not scenario-specific. This is correct behavior - credentials apply across all scenarios. Audit logging will track connection events.
- Principle IX: This feature is a prerequisite for implementing the Git-First architecture. GitRepositoryService will use these stored credentials.

## Project Structure

### Documentation (this feature)

```text
specs/005-github-auth-user-link/
├── plan.md              # This file
├── research.md          # OAuth best practices, encryption patterns
├── data-model.md        # Database schema for connections/associations
├── quickstart.md        # Developer setup guide
└── contracts/           # API endpoint definitions
    ├── github-connections.yaml
    └── github-associations.yaml
```

### Source Code (Existing Repository Structure - Extended)

```text
# Backend Extensions
src/server/
├── api/controllers/
│   └── GitHubConnectionController.ts      # NEW: OAuth flow, PAT management
├── api/routes/
│   └── github-connections.ts              # NEW: /api/github-connections routes
├── services/
│   ├── GitHubConnectionService.ts         # NEW: Core GitHub auth logic
│   ├── GitHubOAuthService.ts              # NEW: OAuth 2.0 flow handling
│   ├── GitHubAssociationService.ts        # NEW: User-people resource mapping
│   └── EncryptionService.ts               # NEW: Token encryption/decryption
├── middleware/
│   └── github-oauth-state.ts              # NEW: OAuth state validation
└── database/migrations/
    ├── 047_create_github_connections.js   # NEW: github_connections table
    ├── 048_create_github_associations.js  # NEW: github_account_associations table
    └── 049_add_github_to_people.js        # NEW: Add GitHub fields to people table

# Frontend Extensions
client/src/
├── pages/
│   └── UserProfile.tsx                    # MODIFY: Add GitHub connections section
├── components/
│   ├── GitHubConnectionManager.tsx        # NEW: List/connect/disconnect UI
│   ├── GitHubOAuthCallback.tsx            # NEW: OAuth redirect handler
│   ├── GitHubPATInput.tsx                 # NEW: PAT entry form
│   └── PeopleGitHubAssociations.tsx       # NEW: Admin association management
├── services/
│   └── github-api.ts                      # NEW: GitHub API client wrapper
└── hooks/
    └── useGitHubConnections.ts            # NEW: React Query hooks

# Shared Types
shared/types/
└── github.ts                              # NEW: GitHubConnection, GitHubAssociation types

# Tests
tests/
├── e2e/suites/github-auth/
│   ├── oauth-flow.spec.ts                 # NEW: Full OAuth flow E2E
│   ├── pat-connection.spec.ts             # NEW: PAT entry E2E
│   └── association-management.spec.ts     # NEW: Admin association UI
├── integration/
│   └── github-connection-service.test.ts  # NEW: Service integration tests
└── unit/
    ├── client/components/
    │   └── GitHubConnectionManager.test.tsx
    └── server/services/
        ├── GitHubOAuthService.test.ts
        └── EncryptionService.test.ts
```

**Structure Decision**: Extending existing web application structure (frontend/ + src/server/). New controllers/services follow established patterns (BaseController, ServiceContainer). Database migrations continue sequential numbering from existing 046_*.js migrations.

## Complexity Tracking

**No Constitution violations** - all principles satisfied without justification needed.

---

## Phase 0: Research & Technical Decisions

*Output: research.md with all technical unknowns resolved*

### Research Questions

1. **OAuth 2.0 Implementation**: Best practices for OAuth state management, token refresh, and CSRF protection
2. **Token Encryption**: Encryption-at-rest strategy for OAuth tokens and PATs
3. **GitHub API Integration**: @octokit/rest usage patterns, rate limiting, GitHub Enterprise support
4. **Association Logic**: Auto-association algorithm based on email matching

### Research Findings

See [research.md](./research.md) for detailed findings. Key decisions:

- **OAuth Library**: Use `simple-oauth2` for OAuth flow handling (mature, well-tested)
- **Encryption**: AES-256-GCM via Node.js crypto module for token encryption
- **GitHub API**: @octokit/rest v20+ with retry plugin for rate limiting
- **State Management**: Cryptographically secure random state tokens, stored in Redis-like cache (or in-memory for Electron)

---

## Phase 1: Design & Contracts

*Output: data-model.md, contracts/, quickstart.md*

### Data Model Summary

See [data-model.md](./data-model.md) for complete schema. Key entities:

- **github_connections**: User-GitHub account links (OAuth/PAT credentials, encrypted)
- **github_account_associations**: Many-to-many mapping between connections and people resources
- **people**: Extended with github_username, github_user_id fields for quick lookups

### API Contracts

See [contracts/](./contracts/) for OpenAPI specs. Key endpoints:

- `POST /api/github-connections/oauth/authorize` - Initiate OAuth flow
- `GET /api/github-connections/oauth/callback` - OAuth redirect handler
- `POST /api/github-connections/pat` - Add PAT connection
- `GET /api/github-connections` - List user's connections
- `DELETE /api/github-connections/:id` - Disconnect account
- `POST /api/github-connections/:id/associations` - Admin: manually associate people resources
- `GET /api/people/:id/github-activity` - Get commit activity for person

### Agent Context Updated

Technology additions to Claude Code context:
- @octokit/rest for GitHub API
- simple-oauth2 for OAuth flows
- Node.js crypto for encryption

---

## Phase 2: Task Breakdown

**NOT GENERATED BY /speckit.plan** - Run `/speckit.tasks` to generate tasks.md

See [tasks.md](./tasks.md) for implementation tasks.

---

## Post-Design Constitution Check

*Re-evaluation after Phase 1 design complete*

| Principle | Status | Implementation Evidence |
|-----------|--------|------------------------|
| I. Type Safety | ✅ PASS | GitHubConnection, GitHubAssociation, OAuthState types defined. Octokit types used for API responses. |
| II. Scenario Isolation & Audit | ✅ PASS | Audit logs for connect/disconnect events. Connections are user-scoped (correct). Git commits attributed via associations. |
| III. Test-Driven Discipline | ✅ PASS | 8 E2E tests (OAuth flow, PAT entry, associations), 15 unit tests (services, encryption), 5 integration tests |
| IV. Validated Inputs | ✅ PASS | Zod schemas for PAT input, OAuth callback validation, GitHub API response schemas |
| V. Controller-Service Separation | ✅ PASS | GitHubConnectionController (HTTP) + GitHubConnectionService (business logic) + GitHubOAuthService (OAuth flow) |
| VI. API Design Consistency | ✅ PASS | Standard envelope: `{ success, data, meta }`. REST conventions. Pagination for connections list. |
| VII. Security by Default | ✅ PASS | AES-256-GCM encryption for tokens. OAuth state CSRF protection. Permission checks for admin associations. |
| VIII. Simplicity | ✅ PASS | Direct @octokit/rest usage. No custom OAuth implementation (use library). Standard crypto module. |
| IX. Git-First Collaboration | ✅ PASS | Provides credentials for GitRepositoryService. Enables Git push/pull operations with user's GitHub account. |

**Final Gate**: ✅ **PASS** - Design maintains all constitution principles. Ready for task generation via `/speckit.tasks`.

---

## Dependencies & Assumptions

### Dependencies on Existing Features
- User authentication system (JWT-based, already implemented)
- People resource management (existing `people` table and API)
- Permission system for admin actions (existing middleware)

### Assumptions
- GitHub.com is primary target; GitHub Enterprise support is secondary
- Users have existing GitHub accounts
- Network connectivity for OAuth redirects (desktop app constraint: must handle localhost callbacks)
- Electron app can open system browser for OAuth flow

### External Dependencies
- **GitHub OAuth App**: Must be registered at github.com/settings/developers (CLIENT_ID, CLIENT_SECRET)
- **GitHub Enterprise**: Optional support for custom URLs (e.g., github.mycompany.com)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth redirect fails in Electron | Medium | High | Use localhost callback server + custom protocol handler |
| Token encryption key compromise | Low | Critical | Use env variable for master key, rotate regularly |
| GitHub API rate limiting | Medium | Medium | Implement exponential backoff, cache responses, show clear UI messages |
| Email matching creates wrong associations | Medium | Medium | Provide admin UI for manual override, show confirmation before auto-linking |
| GitHub Enterprise API differences | Low | Low | Use @octokit/rest which handles both, test with Enterprise instance |

---

## Success Metrics (from spec.md)

Tracking success criteria from feature specification:

- **SC-001**: OAuth completion time < 1 minute (target: < 30 seconds)
- **SC-002**: 95%+ OAuth success rate on first attempt
- **SC-004**: 99%+ correct commit attribution via associations
- **SC-005**: Zero plaintext credentials in database
- **SC-006**: Graceful rate limiting (no user-visible errors under normal load)
- **SC-010**: 100% CSRF protection on OAuth callbacks

---

## Open Questions

*To be resolved during implementation:*

1. **OAuth Callback Server**: Should Electron app run temporary HTTP server on localhost, or use custom protocol handler (capacinator://)?
   - **Recommendation**: Localhost server (easier to implement, standard pattern)

2. **Token Refresh Strategy**: Should OAuth tokens be refreshed automatically in background, or only when user initiates Git sync?
   - **Recommendation**: Automatic refresh 1 hour before expiry (better UX)

3. **Multiple GitHub Enterprise Instances**: Should one user connect to multiple Enterprise instances, or one instance per deployment?
   - **Recommendation**: Support multiple instances (flexibility for consultants)

4. **Association Conflict Resolution**: When email matches multiple people resources, should all be auto-linked or require confirmation?
   - **Recommendation**: Auto-link all, provide admin UI to break specific links (optimistic approach)
