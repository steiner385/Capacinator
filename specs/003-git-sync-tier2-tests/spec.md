# Feature Specification: Git Sync Unit Tests - Tier 2 Validation & Safety

**Feature Branch**: `003-git-sync-tier2-tests`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Git Sync Unit Tests - Tier 2 Validation & Safety (Issue #106)"
**Related GitHub Issue**: #106

## Overview

This feature implements comprehensive unit tests for Tier 2 (Validation & Safety) services of the Git Sync integration. These services are responsible for ensuring data integrity during synchronization, validating business rules, categorizing errors for user-friendly messaging, and performing health checks before Git operations.

The target is 210 tests across three service files, building on the test infrastructure established in Issue #104 and the Tier 1 tests from Issue #105.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Over-Allocation Detection (Priority: P1)

When capacity planners make changes to resource assignments during Git sync operations, the system must detect and warn about over-allocation (when a person is assigned more than 100% of their time across overlapping projects).

**Why this priority**: Over-allocation detection is the core business value of the ConflictValidator. Without this working correctly, users could corrupt their capacity planning data by accepting conflicting changes that violate business rules.

**Independent Test**: Can be fully tested by creating mock database scenarios with overlapping assignments and verifying the validator correctly calculates total allocation percentages and generates appropriate warnings.

**Acceptance Scenarios**:

1. **Given** a person with two existing 60% assignments in overlapping timeframes, **When** validating a new 50% assignment for the same period, **Then** the system detects 170% over-allocation and returns a warning
2. **Given** a person with non-overlapping assignments totaling 150%, **When** validating those assignments, **Then** no over-allocation warning is generated (no overlap)
3. **Given** an assignment that partially overlaps another, **When** calculating allocation, **Then** only the overlapping period is considered for over-allocation calculation

---

### User Story 2 - User-Friendly Error Messages (Priority: P1)

When Git operations fail due to network issues, authentication problems, or other errors, users receive clear, actionable error messages instead of cryptic technical details.

**Why this priority**: User-friendly error messages are critical for usability. Without proper error categorization, users would see raw Git error messages that they cannot understand or act upon.

**Independent Test**: Can be fully tested by providing various error message strings and verifying correct categorization into specific error types with appropriate user-facing messages.

**Acceptance Scenarios**:

1. **Given** an error message containing "ENOTFOUND", **When** categorizing the error, **Then** it is classified as a network error with the message "Cannot connect to GitHub Enterprise..."
2. **Given** an error message containing "401" or "authentication failed", **When** categorizing the error, **Then** it is classified as an authentication error directing users to update credentials
3. **Given** an error message containing "permission denied", **When** categorizing the error, **Then** it is classified as a permission error with guidance to contact the administrator

---

### User Story 3 - Pre-Operation Health Checks (Priority: P2)

Before performing Git operations (clone, push, pull), the system performs health checks to verify network connectivity to the Git server and sufficient disk space, preventing operations that would fail partway through.

**Why this priority**: Health checks prevent partial failures that could leave data in an inconsistent state. While important, they are secondary to the core validation and error handling logic.

**Independent Test**: Can be fully tested by mocking HTTP responses and file system stats to verify connectivity detection and disk space calculation logic.

**Acceptance Scenarios**:

1. **Given** a Git server URL, **When** the server responds with any status < 500, **Then** connectivity is confirmed as reachable
2. **Given** a target directory, **When** checking disk space, **Then** the system correctly calculates available MB and compares against required threshold
3. **Given** insufficient disk space, **When** performing a comprehensive health check, **Then** a GitDiskSpaceError is thrown with specific space requirements

---

### User Story 4 - Date Range Validation (Priority: P2)

When resolving project conflicts, the system validates that project dates are logically consistent (end date after start date) and that project phases fall within project bounds.

**Why this priority**: Date validation ensures data integrity but is less critical than over-allocation detection which directly impacts capacity planning accuracy.

**Independent Test**: Can be fully tested by creating mock projects with various date configurations and verifying validation results.

**Acceptance Scenarios**:

1. **Given** a project with end date before start date, **When** validating the project, **Then** an error is returned indicating invalid dates
2. **Given** a project with phases extending beyond project bounds, **When** validating the project, **Then** errors identify which phases are out of bounds

---

### User Story 5 - Person Data Integrity (Priority: P3)

When resolving person conflicts, the system validates that required fields (first name, last name) are present.

**Why this priority**: Basic data integrity validation, but less complex than other validations and less likely to cause business-critical issues.

**Independent Test**: Can be fully tested by creating mock person records with missing required fields.

**Acceptance Scenarios**:

1. **Given** a person record with empty first name, **When** validating the person, **Then** an error indicates first name is required
2. **Given** a person record with all required fields, **When** validating the person, **Then** validation passes

---

### Edge Cases

- What happens when the database connection fails during validation?
- How does the system handle extremely large allocation percentages (> 1000%)?
- What happens when network check times out vs receives an error response?
- How are malformed URLs handled in health checks?
- What happens when disk space check fails due to permission issues?
- How does error categorization handle errors with multiple matching patterns?

## Requirements *(mandatory)*

### Functional Requirements

#### ConflictValidator Tests (~80 tests)

- **FR-001**: Test suite MUST verify over-allocation detection for overlapping assignment date ranges
- **FR-002**: Test suite MUST verify partial overlap calculations (assignment starts during, ends during, or contains another)
- **FR-003**: Test suite MUST verify non-overlapping assignments do not trigger warnings
- **FR-004**: Test suite MUST verify assignment exclusion logic (exclude current assignment from overlap calculation)
- **FR-005**: Test suite MUST verify project date validation (end date after start date)
- **FR-006**: Test suite MUST verify phase bounds validation (phases within project dates)
- **FR-007**: Test suite MUST verify person required field validation
- **FR-008**: Test suite MUST verify error handling when entities are not found

#### GitErrors Tests (~60 tests)

- **FR-009**: Test suite MUST verify categorization of network errors (ENOTFOUND, ECONNREFUSED, ETIMEDOUT)
- **FR-010**: Test suite MUST verify categorization of authentication errors (401, invalid credentials, bad credentials)
- **FR-011**: Test suite MUST verify categorization of permission errors (permission denied, protected branch)
- **FR-012**: Test suite MUST verify categorization of conflict errors
- **FR-013**: Test suite MUST verify categorization of branch errors (already exists, not found)
- **FR-014**: Test suite MUST verify categorization of push errors (non-fast-forward, rejected)
- **FR-015**: Test suite MUST verify categorization of clone errors (repository not found)
- **FR-016**: Test suite MUST verify user-friendly message generation for all error types
- **FR-017**: Test suite MUST verify error recoverability flags are set correctly
- **FR-018**: Test suite MUST verify unknown errors fall back to generic GitError

#### GitHealthCheck Tests (~70 tests)

- **FR-019**: Test suite MUST verify network connectivity detection for reachable servers
- **FR-020**: Test suite MUST verify network connectivity detection for unreachable servers
- **FR-021**: Test suite MUST verify connection timeout handling
- **FR-022**: Test suite MUST verify HTTPS vs HTTP protocol handling
- **FR-023**: Test suite MUST verify disk space calculation from filesystem stats
- **FR-024**: Test suite MUST verify disk space threshold comparison
- **FR-025**: Test suite MUST verify directory existence checking (fallback to parent)
- **FR-026**: Test suite MUST verify comprehensive health check combining network and disk checks
- **FR-027**: Test suite MUST verify error throwing when health checks fail
- **FR-028**: Test suite MUST verify non-throwing convenience methods (isServerReachable, getAvailableDiskSpaceMB)

### Coverage Targets

- **FR-029**: ConflictValidator tests MUST achieve 85% statement coverage and 80% branch coverage
- **FR-030**: GitErrors tests MUST achieve 100% coverage (pure logic, no I/O)
- **FR-031**: GitHealthCheck tests MUST achieve 85% statement coverage and 80% branch coverage

### Key Entities *(include if feature involves data)*

- **ConflictValidator**: Service that validates business rules during conflict resolution, primarily detecting resource over-allocation
- **GitError Classes**: Hierarchy of error classes (GitNetworkError, GitAuthenticationError, GitPermissionError, etc.) providing user-friendly error handling
- **GitHealthCheck**: Service performing pre-operation health checks for network connectivity and disk space
- **ValidationResult**: Data structure containing validation status, warnings (for over-allocation), and errors
- **OverAllocationWarning**: Data structure describing who is over-allocated, by how much, and which assignments are affected

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 210 tests pass consistently (100% pass rate on CI)
- **SC-002**: ConflictValidator achieves 85% statement coverage and 80% branch coverage
- **SC-003**: GitErrors achieves 100% statement and branch coverage
- **SC-004**: GitHealthCheck achieves 85% statement coverage and 80% branch coverage
- **SC-005**: Test execution completes in under 30 seconds total for all 210 tests
- **SC-006**: Zero flaky tests (tests pass consistently across 5 consecutive runs)
- **SC-007**: All error categorization paths are exercised by at least one test case
- **SC-008**: Over-allocation detection correctly identifies allocations exceeding 100% in all overlap scenarios

## Assumptions

- The test infrastructure from Issue #104 (mock factories, test utilities, Jest configuration) is available and working
- The services under test (ConflictValidator, GitErrors, GitHealthCheck) have stable interfaces that won't change during test development
- Knex database mocking patterns established in Tier 1 tests can be reused
- Node.js built-in http/https modules can be mocked for health check tests
- File system operations (fs.statfs, fs.access) can be mocked for disk space tests

## Dependencies

- Issue #104: Git Sync Test Infrastructure (test utilities, mock factories)
- Issue #105: Git Sync Unit Tests - Tier 1 Critical Services (patterns and infrastructure validation)
