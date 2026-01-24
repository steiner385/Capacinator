<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0 (Minor - Git-First Architecture)
Modified Principles:
  - Principle II: Updated to reference Git history as primary audit trail
  - Architecture Constraints: Git repository as source of truth, SQLite as cache

Added Sections:
  - Principle IX: Git-First Collaboration (NEW)
  - Git Repository Structure in Project Structure
  - Git sync performance targets
  - Git conflict resolution testing standards

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section validated
  ✅ spec-template.md - Requirements alignment validated
  ✅ tasks-template.md - Task categorization aligned with principles
  ⚠ Command files in .claude/commands/ - No CLAUDE-specific references to update

Follow-up TODOs:
  - Implement GitRepositoryService and ScenarioExporter (Principle IX)
  - Add Git conflict resolution UI flows
  - Create Git sync integration tests
  - Document Git repository initialization procedure
  - Monitor adoption of request validation (Principle IV) in new features
  - Track test coverage improvements toward 80% target (Principle III)
  - Schedule first constitution compliance review (Q2 2026)

Architectural Decision Rationale:
  - Git-as-Database chosen for v1.0 to leverage existing GitHub Enterprise infrastructure
  - Avoids SQLite corruption risks from OneDrive file-level sync
  - Provides native conflict resolution and version control
  - No new infrastructure required (constraint: highly-controlled IT environment)
  - SQLite retained as ephemeral cache for query performance

Recommendations vs. Current State:
  - HIGH PRIORITY: Implement Git sync services (Principle IX) - New architecture
  - HIGH PRIORITY: Request validation middleware (Principle IV) - Currently missing
  - HIGH PRIORITY: Standardized error classes (Principle IV) - Generic errors used today
  - MEDIUM PRIORITY: API response envelope (Principle VI) - Inconsistent nesting exists
  - MEDIUM PRIORITY: HttpOnly cookie tokens (Principle VII) - localStorage used today
-->

# Capacinator Constitution

## Core Principles

### I. Type Safety (NON-NEGOTIABLE)

TypeScript MUST be used with strict mode across all source code (frontend, backend, shared). All API contracts, database models, and component props MUST have explicit type definitions. Runtime validation MUST complement compile-time types at system boundaries (user input, external APIs, file imports).

**Rationale**: Type safety prevents entire classes of bugs at compile time, enables confident refactoring, and serves as living documentation. The 40+ database migrations and complex scenario system require compile-time guarantees to prevent data corruption.

**Current State**: Strictly enforced with TypeScript across codebase. Shared types in `/shared/types/` prevent duplication.

**Gap**: Runtime validation (zod/yup schemas) missing for POST/PUT request bodies.

---

### II. Scenario Isolation & Audit Transparency (NON-NEGOTIABLE)

All data operations MUST be scenario-aware. The system distinguishes between "working scenarios" (draft planning) and "committed scenarios" (production state). Working scenario changes remain local until explicitly published to the Git repository. All CREATE, UPDATE, DELETE operations MUST generate audit entries with full context (user, timestamp, change description, old/new values). Git commit history serves as the primary audit trail for multi-user collaboration. Optional application-level audit logs MAY supplement Git history for detailed change tracking.

**Rationale**: Resource planning requires "what-if" analysis without affecting committed plans. Git-based audit transparency enables undo operations (via git revert), compliance reporting (commit history), and troubleshooting data corruption (diff history). This is a domain-specific requirement for capacity planning in enterprise environments.

**Current State**: Partially implemented via `ScenarioContext` and middleware. Git integration pending (Principle IX).

---

### III. Test-Driven Discipline

New features MUST include tests proportional to complexity and risk. Critical paths (authentication, resource allocation, conflict detection, scenario operations) MUST have integration tests. E2E tests MUST cover complete user workflows. Unit tests SHOULD use test data factories for consistency. Test coverage target: 80% line coverage.

**Rationale**: The system manages resource allocation decisions affecting real projects and budgets. Data integrity bugs are expensive. TDD reduces regression risk during refactoring.

**Current State**: 322 test files with Jest (unit) + Playwright (E2E). Coverage estimated at 40-50%. TestDataGenerator exists but inconsistently used.

**Gap**: Error paths under-tested. Test factories needed for consistency.

---

### IV. Validated Inputs & Semantic Errors

All API endpoints accepting POST/PUT/PATCH MUST validate request bodies using schema validation (zod/yup). Controllers MUST NOT manually filter fields. Error responses MUST use semantic error classes with HTTP status codes, error codes, and user-friendly messages. Error classes MUST distinguish: `NotFoundError` (404), `ValidationError` (422), `ConflictError` (409), `UnauthorizedError` (401), `ForbiddenError` (403).

**Rationale**: Manual field filtering is error-prone and allows invalid data to propagate. Semantic errors enable better client-side error handling and user experience.

**Current State**: Manual filtering used in controllers (e.g., `PeopleController.create`). Generic `OperationalError` used for all business logic errors.

**Gap**: This principle represents a **recommended improvement** from current state. Adoption required for new features; existing code refactored opportunistically.

---

### V. Controller-Service Separation

Controllers MUST handle HTTP concerns only (request parsing, response formatting, error translation). Business logic MUST reside in service classes. Controllers MUST extend `BaseController` for consistent error handling, pagination, and logging. Services MUST be injected via `ServiceContainer` for testability.

**Rationale**: Separation of concerns enables service reuse (CLI, scheduled jobs, background workers), simplifies testing (mock HTTP vs. test logic), and maintains single responsibility principle.

**Current State**: Well-implemented. BaseController provides `handleError()`, `handleNotFound()`, `paginate()`. ServiceContainer manages dependencies.

---

### VI. API Design Consistency

All API responses MUST use a standard envelope format: `{ success: boolean, data?: T, error?: {...}, meta: {...} }`. Endpoints MUST follow REST conventions: `GET /api/resources` (list), `POST /api/resources` (create), `GET /api/resources/:id` (detail), `PUT /api/resources/:id` (update), `DELETE /api/resources/:id` (delete). Pagination MUST use `{ page, limit, total, totalPages }`. API versioning SHOULD be implemented when breaking changes are introduced.

**Rationale**: Consistent response structure simplifies client-side error handling and loading state management. Versioning prevents breaking existing clients.

**Current State**: Inconsistent response nesting (`{ data: { data: Project } }` vs. `{ data: Project }`). No versioning strategy.

**Gap**: Standardize response envelope. Define versioning strategy before first breaking change.

---

### VII. Security by Default

JWT access tokens MUST have short expiration (15-30 minutes). Refresh tokens SHOULD use HttpOnly cookies to prevent XSS attacks. All passwords MUST be hashed with bcrypt. Content Security Policy MUST prohibit `unsafe-inline` for scripts (development exceptions allowed for Vite HMR). All sensitive operations (delete, role changes, scenario commit) MUST require permission checks via `requirePermission()` middleware.

**Rationale**: Electron apps can be inspected; client-side token storage is vulnerable. CSP prevents XSS exploitation. Permission checks prevent privilege escalation.

**Current State**: JWT-based auth implemented. Tokens stored in localStorage (vulnerable). CSP configured with `unsafe-inline` removed for scripts. Permission middleware in place.

**Gap**: Migrate refresh tokens to HttpOnly cookies for production deployments.

---

### VIII. Simplicity & Minimal Abstraction

Features MUST start with the simplest solution that satisfies requirements. Abstractions MUST be justified by concrete duplication (3+ occurrences) or clear separation of concerns. Avoid premature optimization. Prefer explicit code over clever code. Configuration MUST have safe defaults.

**Rationale**: Over-engineering increases maintenance burden and cognitive load. The codebase has 46+ migrations, 40+ tables, and complex fiscal week logic—unnecessary abstraction compounds complexity.

**Current State**: Generally adhered to. Some areas (query builders, error handling) could benefit from targeted abstraction.

---

### IX. Git-First Collaboration (NON-NEGOTIABLE)

The Git repository (GitHub Enterprise) is the single source of truth for all persistent application state. Scenario data MUST be stored as JSON files in the Git repository under `scenarios/` directory. SQLite database is an ephemeral query cache, rebuilt from Git repository on application startup. Users initiate sync explicitly via "Save & Sync" or "Refresh" actions. Git's native conflict resolution handles concurrent edits. Application MUST provide conflict detection UI when Git merge conflicts occur, guiding users through resolution with domain-specific validation (e.g., over-allocation warnings).

**Rationale**: Leverages existing GitHub Enterprise infrastructure (constraint: no new servers allowed). Git provides proven conflict resolution, version control, and rollback capabilities. Avoids SQLite corruption from file-level sync (OneDrive/SharePoint). Familiar workflow for technical users. Git commit history serves as immutable audit trail.

**Current State**: Not implemented. Current architecture uses standalone SQLite. Migration required.

**Implementation Requirements**:
- `GitRepositoryService` for clone/pull/commit/push operations (use `simple-git` or `nodegit` library)
- `ScenarioExporter` for SQLite → JSON and JSON → SQLite transformations
- Conflict resolution UI for assignment over-allocation, concurrent project edits
- Performance: Rebuild SQLite from JSON in < 3 seconds for typical dataset (100 projects, 50 people, 500 assignments)
- Offline support: Users work locally, sync when network available

---

## Architecture Constraints

### Stack & Technology Choices

**Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + Radix UI (shadcn/ui)
**Backend**: Node.js + Express + TypeScript
**Persistent Storage**: Git repository (GitHub Enterprise) with JSON files
**Query Cache**: SQLite (better-sqlite3) - ephemeral, rebuilt from Git on startup
**State Management**: React Query (TanStack Query v5) + Context API
**Desktop**: Electron (standalone app)
**Version Control**: Git integration via `simple-git` or `nodegit` library
**Testing**: Jest (unit/integration) + Playwright (E2E)

**Constraints**:
- **Git as source of truth** - GitHub Enterprise repository stores all persistent state (constraint: no new infrastructure allowed in enterprise IT environment)
- **SQLite as cache only** - rebuilt from JSON on app start, disposable between sessions
- **Electron for cross-platform** packaging (Windows, macOS, Linux)
- **Offline-first with sync** - users work locally, sync to Git when network available
- **No server-side infrastructure** - all operations client-side Git + local SQLite

### Project Structure

**Application Code**:
- **Frontend**: `/client/src/` with components/, pages/, contexts/, hooks/, services/, types/
- **Backend**: `/src/server/` with api/controllers/, api/routes/, services/, middleware/, database/
- **Shared**: `/shared/types/` for domain models used by both tiers
- **Tests**: `/tests/e2e/` (Playwright), colocated `__tests__/` (Jest)

**Git Repository Structure** (GitHub Enterprise):
```
data-repository/ (separate repo from application code)
├── scenarios/
│   ├── working/
│   │   ├── projects.json
│   │   ├── people.json
│   │   ├── assignments.json
│   │   ├── project_phases.json
│   │   └── metadata.json
│   └── committed/
│       └── [same structure as working/]
├── master-data/
│   ├── roles.json
│   ├── locations.json
│   └── project_types.json
├── audit/
│   └── changes.jsonl (optional: application-level audit log)
└── README.md (repository documentation)
```

**Rules**:
- **Git repository** stores all persistent state; application code and data are separate repos
- **Shared types** MUST contain only domain models, DTOs, and shared enums (no UI types or server-only logic)
- **SQLite schema** MAY evolve via migrations but is always rebuildable from JSON (migrations for performance indexes only)
- **E2E tests** MUST use isolated Git repository and SQLite database
- **Scenario isolation**: Working scenario changes stay local until explicit "Publish" action commits to Git

---

## Quality Standards

### Code Quality

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Linting**: ESLint with TypeScript rules, React hooks plugin
- **Formatting**: Prettier (if configured) or consistent manual style
- **Naming**: camelCase (variables/functions), PascalCase (classes/components), UPPER_SNAKE_CASE (constants)

### Testing Standards

- **Unit Tests**: Mock external dependencies (Git operations, database, API client, contexts)
- **Integration Tests**: Test service layer with real Git repository (temp directory) and SQLite
- **E2E Tests**: Full user workflows with UI interaction, organized in `/tests/e2e/suites/`
- **Git Conflict Tests**: Simulate concurrent edits, verify conflict detection and resolution UI
- **Test Data**: Use `TestDataGenerator` or factories for consistency
- **Coverage**: Aim for 80% line coverage; 100% for critical paths (auth, Git sync, conflict detection, scenario operations)

### Performance Targets

- **API Response**: p95 < 200ms for list endpoints, < 100ms for detail endpoints (local SQLite cache)
- **Frontend Render**: First Contentful Paint < 1.5s on desktop, React Query cache prevents unnecessary re-fetches
- **Database Queries**: Use indexed columns for filtering (id, scenario_id, person_id, project_id)
- **Excel Import**: Process 1000-row spreadsheet in < 5 seconds
- **Git Sync Operations**:
  - Initial clone: < 10 seconds for typical repository (< 5MB JSON)
  - Pull updates: < 3 seconds for incremental changes
  - Commit + push: < 5 seconds for scenario save
  - SQLite rebuild from JSON: < 3 seconds for typical dataset (100 projects, 50 people, 500 assignments)
- **Conflict Detection**: < 1 second to identify merge conflicts after pull

### Security Requirements

- **Authentication**: JWT with 15-minute access token expiration
- **Authorization**: Role-based permissions checked via middleware
- **Input Validation**: Schema validation for all POST/PUT/PATCH requests
- **Output Sanitization**: No raw SQL query results exposed (use typed models)
- **Audit Logging**: All mutations logged with user context
- **CSP**: No inline scripts in production, strict CSP headers via Helmet

---

## Governance

### Amendment Process

Constitution changes MUST be documented with rationale. Version MUST increment according to semantic versioning:
- **MAJOR**: Backward-incompatible principle changes (e.g., removing a non-negotiable rule)
- **MINOR**: New principles or expanded guidance (e.g., adding new quality standard)
- **PATCH**: Clarifications, wording, non-semantic refinements

### Compliance Review

All feature specifications MUST include a "Constitution Check" section verifying alignment with Core Principles. Pull requests violating principles MUST justify exceptions with:
- Why needed (concrete problem)
- Simpler alternative rejected because (specific reason)
- Migration plan (if introducing technical debt)

### Complexity Justification

Any feature requiring new abstractions, third-party dependencies, or architectural changes MUST document:
- Problem being solved
- Alternatives considered
- Why simpler approach insufficient

### Violation Remediation

Constitution violations discovered in existing code:
- **Critical Violations** (security, audit bypass): Fix immediately
- **High Priority** (missing validation, inconsistent responses): Fix within 2 sprints
- **Medium Priority** (test coverage gaps, suboptimal patterns): Fix opportunistically during related work
- **Low Priority** (style inconsistencies): Backlog for tech debt sprints

### Living Document

Constitution SHOULD be reviewed quarterly. Principle changes trigger template updates and team communication. Use `.specify/templates/plan-template.md`, `spec-template.md`, and `tasks-template.md` as enforcement mechanisms.

**Version**: 1.1.0 | **Ratified**: 2026-01-24 | **Last Amended**: 2026-01-24
