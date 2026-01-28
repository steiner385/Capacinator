# Feature Specification: Fix CI Test Failures

**Feature Branch**: `004-fix-ci-failures`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Fix all CI test failures including timezone-sensitive date tests and flaky UI tests"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable CI Pipeline (Priority: P1)

As a developer, I need the CI pipeline to pass consistently so that I can merge pull requests without dealing with flaky test failures that are unrelated to my changes.

**Why this priority**: CI reliability is foundational - failing tests block all development work and erode confidence in the test suite.

**Independent Test**: Can be verified by running CI 5 consecutive times with 100% pass rate.

**Acceptance Scenarios**:

1. **Given** a developer pushes code to a PR, **When** the CI pipeline runs, **Then** all tests pass consistently regardless of the CI environment's timezone
2. **Given** a developer pushes code that doesn't modify UI components, **When** the CI runs UI tests, **Then** those tests do not fail due to timing/race conditions
3. **Given** CI runs on different machines with different configurations, **When** date-related tests execute, **Then** the tests produce the same results regardless of system timezone

---

### User Story 2 - Timezone-Independent Date Tests (Priority: P1)

As a test maintainer, I need date calculation tests to be timezone-agnostic so that they pass in any CI environment (UTC, PST, EST, etc.).

**Why this priority**: Date calculation tests are failing specifically due to timezone differences between local development (possibly UTC+X) and CI (UTC), causing off-by-one day errors.

**Independent Test**: Can be tested by running the phaseDurations test suite with TZ=UTC and TZ=America/Los_Angeles environment variables and getting identical results.

**Acceptance Scenarios**:

1. **Given** a date test that calculates "56 days from 2025-01-20", **When** the test runs in UTC timezone, **Then** the result matches the expected date
2. **Given** the same date test, **When** the test runs in PST timezone, **Then** the result matches UTC results exactly
3. **Given** date inputs provided as ISO strings, **When** dates are calculated, **Then** timezone offsets do not affect the day boundaries

---

### User Story 3 - Stable UI Modal Tests (Priority: P2)

As a test maintainer, I need UI modal tests to be stable so that async state changes don't cause intermittent failures.

**Why this priority**: The LocationModal test is failing intermittently due to timing issues with "Saving..." text appearing - this is a classic async testing anti-pattern.

**Independent Test**: Can be tested by running LocationModal tests 10 consecutive times with 100% pass rate.

**Acceptance Scenarios**:

1. **Given** a modal form submission test, **When** the form is submitted, **Then** the test waits for the expected state change without race conditions
2. **Given** a test checks for loading state ("Saving..."), **When** the API mock resolves slowly, **Then** the test correctly waits for and detects the loading state
3. **Given** a test verifies UI state transitions, **When** async operations complete, **Then** the test properly awaits state changes before assertions

---

### Edge Cases

- What happens when date calculations span daylight saving time transitions?
- How does the system handle date calculations that cross year boundaries?
- What happens when UI tests run on slower CI machines with different timing?
- How do tests behave when the system clock is at midnight (day boundary)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Date calculation tests MUST produce identical results regardless of the system timezone (UTC, PST, EST, etc.)
- **FR-002**: Date calculation utilities MUST use timezone-aware date handling that normalizes to a consistent timezone
- **FR-003**: UI tests MUST properly await async state changes before making assertions
- **FR-004**: Modal tests MUST handle timing variations in API mock responses
- **FR-005**: All date-related test assertions MUST be deterministic and not depend on system locale
- **FR-006**: Tests MUST NOT use hardcoded expected dates that assume a specific timezone offset
- **FR-007**: UI tests MUST use appropriate testing-library utilities (waitFor, findBy*) for async assertions

### Key Entities

- **phaseDurations.ts**: Date calculation utility that needs timezone-safe implementation
- **phaseDurations.test.ts**: Test file with failing timezone-sensitive assertions
- **LocationModal.test.tsx**: UI test file with flaky async timing issues

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: CI pipeline achieves 100% pass rate across 5 consecutive runs
- **SC-002**: All 56 previously failing tests now pass consistently
- **SC-003**: Date calculation tests produce identical results when run with TZ=UTC and TZ=America/Los_Angeles
- **SC-004**: LocationModal tests pass 10/10 times when run in isolation
- **SC-005**: No test flakiness reported in the next 10 PR CI runs

## Assumptions

- The CI environment runs tests in UTC timezone
- Local development may run in various timezones (contributor-dependent)
- The phaseDurations utility uses JavaScript's Date object which is timezone-sensitive
- The LocationModal uses React state which updates asynchronously

## Out of Scope

- Performance optimization of the date calculation functions
- Refactoring the LocationModal component itself (only fixing tests)
- Adding new date calculation features
- Changing the application's date display format
