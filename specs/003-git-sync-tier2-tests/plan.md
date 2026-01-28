# Implementation Plan: Git Sync Unit Tests - Tier 2 Validation & Safety

**Branch**: `003-git-sync-tier2-tests` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-git-sync-tier2-tests/spec.md`

## Summary

Implement 210 unit tests for Tier 2 (Validation & Safety) Git Sync services. These services ensure data integrity during Git sync operations through business rule validation (ConflictValidator), user-friendly error handling (GitErrors), and pre-operation health checks (GitHealthCheck). Tests use inline Jest mocks for database queries, HTTP modules, and filesystem operations, following patterns established in Tier 1 tests.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES2022 target), Node.js 20+
**Primary Dependencies**: Jest 30, Knex (mocked), simple-git (not directly tested)
**Storage**: N/A (testing only - services use SQLite via Knex)
**Testing**: Jest with ts-jest, custom matchers from Tier 1 infrastructure
**Target Platform**: Node.js (server-side test execution)
**Project Type**: Single project (testing suite extension)
**Performance Goals**: All 210 tests complete in < 30 seconds
**Constraints**: No external test databases; all I/O mocked
**Scale/Scope**: 3 test files, ~70 tests each, 85-100% coverage targets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety | ✅ Pass | Tests use TypeScript with strict mode |
| II. Scenario Isolation | ✅ N/A | Testing only, no persistent data |
| III. Test-Driven Discipline | ✅ Pass | **This feature implements tests** |
| IV. Validated Inputs | ✅ N/A | No new API endpoints |
| V. Controller-Service Separation | ✅ N/A | Testing existing services |
| VI. API Design Consistency | ✅ N/A | No new APIs |
| VII. Security by Default | ✅ N/A | No auth changes |
| VIII. Simplicity | ✅ Pass | Uses established mocking patterns |
| IX. Git-First Collaboration | ✅ Pass | Tests support Git sync feature |

**Post-Design Re-Check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-git-sync-tier2-tests/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 - mocking patterns research
├── data-model.md        # Phase 1 - service interfaces
├── quickstart.md        # Phase 1 - test running guide
├── contracts/           # Phase 1 - N/A for testing feature
│   └── README.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (test files)

```text
tests/unit/server/services/git/__tests__/
├── ConflictValidator.test.ts    # ~80 tests (NEW)
├── GitErrors.test.ts            # ~60 tests (NEW)
├── GitHealthCheck.test.ts       # ~70 tests (NEW)
├── GitConflictResolver.test.ts  # Existing (Tier 1)
├── ScenarioExporter.test.ts     # Existing (Tier 1)
├── GitRepositoryService.test.ts # Existing (Tier 1)
└── git-test-infrastructure.test.ts # Existing (#104)
```

### Services Under Test

```text
src/server/services/git/
├── ConflictValidator.ts    # Business rule validation
├── GitErrors.ts            # Error categorization
└── GitHealthCheck.ts       # Network/disk health checks
```

**Structure Decision**: Tests are colocated with existing Git service tests in `tests/unit/server/services/git/__tests__/`. No new directories needed.

## Phase 0 Artifacts

- **[research.md](./research.md)**: Knex mocking patterns, HTTP/FS mocking, error test matrix, date overlap scenarios

## Phase 1 Artifacts

- **[data-model.md](./data-model.md)**: Service interfaces, mock data structures, validation rules
- **[quickstart.md](./quickstart.md)**: Test execution commands, templates, coverage targets
- **[contracts/](./contracts/)**: N/A for testing feature (README explains why)

## Test Distribution Summary

| Test File | Tests | Coverage Target | Focus Areas |
|-----------|-------|-----------------|-------------|
| ConflictValidator.test.ts | ~80 | 85%/80% | Over-allocation detection, date range validation, entity validation |
| GitErrors.test.ts | ~60 | 100%/100% | Error categorization, user-friendly messages, recoverability flags |
| GitHealthCheck.test.ts | ~70 | 85%/80% | Network connectivity, disk space checks, health check composition |
| **Total** | **210** | | |

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Complexity Level | Rationale |
|--------|------------------|-----------|
| Mocking approach | Low | Inline Jest mocks (no external libraries) |
| Test organization | Low | Follows established Tier 1 patterns |
| Coverage requirements | Medium | 100% for pure logic, 85% for I/O |

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Implement tests in priority order (P1 user stories first)
3. Verify coverage targets with `npm test -- --coverage`
4. Run 5 consecutive test executions to verify no flaky tests
