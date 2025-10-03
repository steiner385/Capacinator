# Unit Test Results Summary

## Overall Statistics
- **Total Tests**: 871
- **Passed**: 831 ✓
- **Failed**: 3 ✗
- **Skipped**: 37 ○

## Failed Tests (3)

All failed tests are related to SQLite foreign key constraints not being enforced in the test database:

1. **Scenario Database Operations › Scenario CRUD Operations › should enforce foreign key constraints**
   - Location: `tests/integration/__tests__/database/scenario-operations.test.ts:112`
   - Issue: Foreign key constraint not being enforced

2. **Scenario Database Operations › Data Integrity and Constraints › should maintain referential integrity on assignment deletes**
   - Location: `tests/integration/__tests__/database/scenario-operations.test.ts:460`
   - Issue: Foreign key constraint not being enforced

3. **Assignment Business Rules Validation › CRITICAL: Data Integrity Validation › should enforce referential integrity for assignments**
   - Location: `tests/integration/controllers/AssignmentBusinessRules.test.ts:418`
   - Issue: Foreign key constraint not being enforced

## Skipped Tests (37)

Main categories of skipped tests:
1. **SQLite Constraint Tests** - Skipped because SQLite test DB not enforcing constraints
2. **Cascade Service Tests** - Skipped because cascade service implementation is incomplete
3. **Dependency Chain Tests** - Complex dependency handling not fully implemented
4. **Transaction/Locking Tests** - Some tests hanging due to transaction issues

## Success Rate
- **95.5%** of tests are passing (831/871)
- Only **0.3%** failing (3/871)
- **4.2%** skipped (37/871)

## Notes
- The 3 failing tests are all due to the same root cause: SQLite not enforcing foreign key constraints in the test environment
- Most skipped tests are intentionally skipped due to known limitations or incomplete features
- The previously fixed E2E utilization modal tests are separate from these unit tests