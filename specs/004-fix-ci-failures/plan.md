# Implementation Plan: Fix CI Test Failures

**Branch**: `004-fix-ci-failures` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-fix-ci-failures/spec.md`

## Summary

Fix 56 failing tests in the CI pipeline caused by two root issues: (1) timezone-sensitive date calculations in `phaseDurations.ts` that produce different results in UTC vs local timezones, and (2) flaky async timing in `LocationModal.test.tsx` that doesn't properly await state changes. The fix involves making date utilities timezone-agnostic and updating UI tests to use proper async patterns.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES2022 target), Node.js 20+
**Primary Dependencies**: Jest 30, React Testing Library, date-fns (if needed for TZ handling)
**Storage**: N/A (test fixes only)
**Testing**: Jest with ts-jest, React Testing Library
**Target Platform**: Node.js (CI environment, UTC timezone)
**Project Type**: Single project (testing fixes)
**Performance Goals**: All tests complete in < 30 seconds, 0 flaky tests
**Constraints**: Tests must pass regardless of system timezone (UTC, PST, EST, etc.)
**Scale/Scope**: 2 test files, ~60 test cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety | ✅ Pass | TypeScript strict mode maintained |
| II. Scenario Isolation | ✅ N/A | No data operations modified |
| III. Test-Driven Discipline | ✅ Pass | **This feature fixes test reliability** |
| IV. Validated Inputs | ✅ N/A | No API changes |
| V. Controller-Service Separation | ✅ N/A | No controller/service changes |
| VI. API Design Consistency | ✅ N/A | No API changes |
| VII. Security by Default | ✅ N/A | No security changes |
| VIII. Simplicity | ✅ Pass | Minimal changes to fix root cause |
| IX. Git-First Collaboration | ✅ N/A | No Git sync changes |

**Post-Design Re-Check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-ci-failures/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 - timezone handling research
├── data-model.md        # Phase 1 - N/A (no data model changes)
├── quickstart.md        # Phase 1 - test running guide
├── contracts/           # Phase 1 - N/A (no API changes)
│   └── README.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (files to modify)

```text
client/src/utils/
├── phaseDurations.ts              # Timezone-safe date handling
└── __tests__/
    └── phaseDurations.test.ts     # Fix timezone-sensitive assertions

client/src/components/modals/__tests__/
└── LocationModal.test.tsx         # Fix async timing issues
```

**Structure Decision**: No new directories. Fixes apply to existing test files and one utility file.

## Phase 0 Artifacts

- **[research.md](./research.md)**: JavaScript Date timezone handling, testing-library async patterns

## Phase 1 Artifacts

- **[data-model.md](./data-model.md)**: N/A for test fixes (README explains why)
- **[quickstart.md](./quickstart.md)**: Test execution commands and verification steps
- **[contracts/](./contracts/)**: N/A for test fixes (README explains why)

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Complexity Level | Rationale |
|--------|------------------|-----------|
| Date handling fix | Low | Use UTC-consistent date parsing |
| Async test fix | Low | Use waitFor properly |
