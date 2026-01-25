# Tasks: Fix CI Test Failures

**Input**: Design documents from `/specs/004-fix-ci-failures/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: No new tests needed - this feature fixes existing tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `client/src/`
- **Backend**: `src/server/`

---

## Phase 1: Setup

**Purpose**: Understand the current state and prepare for fixes

- [x] T001 Read current test file to understand failing assertion in client/src/utils/__tests__/phaseDurations.test.ts
- [x] T002 [P] Read current test file to understand failing assertion in client/src/components/modals/__tests__/LocationModal.test.tsx
- [x] T003 [P] Verify test failures locally with `TZ=UTC npm test -- client/src/utils/__tests__/phaseDurations.test.ts`

---

## Phase 2: User Story 1 - Timezone-Independent Date Tests (Priority: P1) 🎯 MVP

**Goal**: Fix date calculation tests to pass regardless of system timezone

**Independent Test**: Run `TZ=UTC npm test -- client/src/utils/__tests__/phaseDurations.test.ts` and `TZ=America/Los_Angeles npm test -- client/src/utils/__tests__/phaseDurations.test.ts` with identical results

### Implementation for User Story 1

- [x] T004 [US1] Fix expected date value from '2025-03-16' to '2025-03-17' at line 114 in client/src/utils/__tests__/phaseDurations.test.ts
- [x] T005 [US1] Verify phaseDurations tests pass with `TZ=UTC npm test -- client/src/utils/__tests__/phaseDurations.test.ts`
- [x] T006 [US1] Verify phaseDurations tests pass with `TZ=America/Los_Angeles npm test -- client/src/utils/__tests__/phaseDurations.test.ts`

**Checkpoint**: phaseDurations tests pass in all timezones

---

## Phase 3: User Story 2 - Stable UI Modal Tests (Priority: P2)

**Goal**: Fix LocationModal async test to properly await state changes

**Independent Test**: Run `for i in {1..10}; do npm test -- client/src/components/modals/__tests__/LocationModal.test.tsx; done` with 10/10 passes

### Implementation for User Story 2

- [x] T007 [US2] Wrap synchronous expect with waitFor at line 220 in client/src/components/modals/__tests__/LocationModal.test.tsx
- [x] T008 [US2] Verify LocationModal tests pass with `npm test -- client/src/components/modals/__tests__/LocationModal.test.tsx`
- [x] T009 [US2] Run LocationModal tests 5 consecutive times to verify no flakiness

**Checkpoint**: LocationModal tests pass consistently without timing issues

---

## Phase 4: Polish & Verification

**Purpose**: Full verification across all affected tests

- [x] T010 Run all affected tests together: `npm test -- client/src/utils/__tests__/phaseDurations.test.ts client/src/components/modals/__tests__/LocationModal.test.tsx`
- [x] T011 Run full smoke test suite: `npm test -- --project=smoke`
- [x] T012 Run 5 consecutive test runs to verify CI stability
- [ ] T013 Commit changes with descriptive message
- [ ] T014 Push to branch and verify CI passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on T001 completion
- **User Story 2 (Phase 3)**: Depends on T002 completion, can run in parallel with Phase 2
- **Polish (Phase 4)**: Depends on Phase 2 and Phase 3 completion

### User Story Dependencies

- **User Story 1 (P1)**: Independent - phaseDurations.test.ts only
- **User Story 2 (P2)**: Independent - LocationModal.test.tsx only

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T004-T006 (US1) and T007-T009 (US2) can run in parallel (different files)

---

## Parallel Example

```bash
# Launch US1 and US2 in parallel (different files):
Task: "[US1] Fix expected date value in client/src/utils/__tests__/phaseDurations.test.ts"
Task: "[US2] Wrap synchronous expect with waitFor in client/src/components/modals/__tests__/LocationModal.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: User Story 1 (T004-T006)
3. **STOP and VALIDATE**: Verify date tests pass in all timezones
4. Can merge just this fix if urgent

### Full Fix

1. Complete Setup → Understand both issues
2. Fix User Story 1 → Date tests stable
3. Fix User Story 2 → Modal tests stable
4. Polish → Full CI verification
5. Push to branch → CI passes

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 14 |
| US1 Tasks | 3 |
| US2 Tasks | 3 |
| Setup Tasks | 3 |
| Polish Tasks | 5 |
| Parallelizable | 6 (43%) |

### Changes Required

| File | Line | Change |
|------|------|--------|
| `client/src/utils/__tests__/phaseDurations.test.ts` | 114 | `'2025-03-16'` → `'2025-03-17'` |
| `client/src/components/modals/__tests__/LocationModal.test.tsx` | 220 | Wrap `expect(screen.getByText('Saving...'))` with `await waitFor(...)` |

---

## Notes

- Both fixes are single-line changes
- No production code changes required
- Fixes are mathematically correct (date calculation) and best-practice (async testing)
- Commit after each user story phase for atomic changes
