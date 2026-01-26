# Data Model: Fix CI Test Failures

**Feature**: 004-fix-ci-failures

## Not Applicable

This feature focuses on fixing test reliability issues. No data model changes are required:

- No new entities
- No schema changes
- No database migrations

The fixes are purely in test code and one utility function's test assertions.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `client/src/utils/__tests__/phaseDurations.test.ts` | Test Fix | Correct expected date value |
| `client/src/components/modals/__tests__/LocationModal.test.tsx` | Test Fix | Add async waitFor pattern |
