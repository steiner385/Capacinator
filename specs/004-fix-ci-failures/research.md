# Research: Fix CI Test Failures

**Feature**: 004-fix-ci-failures
**Date**: 2026-01-25

## Research Topics

### 1. JavaScript Date Timezone Handling

**Problem**: The test `'handles date calculations across month boundaries'` expects `2025-03-16` but CI (running in UTC) returns `2025-03-17`.

**Root Cause Analysis**:

```javascript
// Current problematic code
const startDate = new Date('2025-01-20'); // Parsed as UTC midnight
const result = calculatePhaseDates('Development', startDate);
// toISOString() returns UTC, but if local timezone is UTC+X,
// the date shifts when converting back
```

When `new Date('2025-01-20')` is parsed:
- In UTC: `2025-01-20T00:00:00.000Z`
- When adding 56 days and calling `toISOString().split('T')[0]`:
  - In UTC: `2025-03-17` (56 days from Jan 20 = Mar 17)
  - But the test expects `2025-03-16` (off-by-one)

**Wait - let me recalculate**:
- Jan 20 + 56 days:
  - Jan has 31 days, so Jan 20 + 11 days = Jan 31
  - Feb has 28 days (2025 is not a leap year), so +28 = 39 days total (Feb 28)
  - Mar 17 = 39 + 17 = 56 days ✓

The expected value `2025-03-16` in the test is actually **wrong** - it should be `2025-03-17`.

**Decision**: Fix the test assertion to use the correct expected value (`2025-03-17`).

**Alternative Considered**: Using date-fns with UTC-forced operations - rejected because the underlying calculation is correct, only the test expectation is wrong.

---

### 2. React Testing Library Async Patterns

**Problem**: `LocationModal.test.tsx` test "shows saving state during submission" fails intermittently because it checks for "Saving..." text synchronously after click.

**Root Cause Analysis**:

```javascript
// Current problematic code (line 218-220)
fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));
expect(screen.getByText('Saving...')).toBeInTheDocument();  // ❌ May not be visible yet!
```

The state update from `setSaving(true)` happens asynchronously after the click event, so the text may not be in the DOM immediately.

**Best Practice Solution**:

```javascript
// Option 1: Use waitFor for state changes
fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));
await waitFor(() => {
  expect(screen.getByText('Saving...')).toBeInTheDocument();
});

// Option 2: Use findBy* (combines getBy + waitFor)
fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));
expect(await screen.findByText('Saving...')).toBeInTheDocument();
```

**Decision**: Use `waitFor` to wrap the assertion, consistent with other async tests in the same file.

**Rationale**: The test file already uses `waitFor` in many places (lines 127, 141, 158, etc.), so this maintains consistency.

---

### 3. Other Failing Tests Investigation

Based on CI logs, there are 10 failed test suites with 56 failed tests total. Let me identify the patterns:

**Date-Related Failures** (phaseDurations.test.ts):
- Line 114: Off-by-one day calculation
- Fix: Correct the expected value

**Async Timing Failures** (LocationModal.test.tsx):
- Line 220: Synchronous assertion on async state
- Fix: Wrap with `waitFor`

**Other Potential Flaky Tests** (to verify):
- Any test using `setTimeout` without proper waiting
- Tests that don't await async operations
- Tests with race conditions between state updates

---

## Summary of Findings

| Issue | Root Cause | Fix Strategy |
|-------|------------|--------------|
| phaseDurations date calc | Test expectation is mathematically wrong | Correct expected value to `2025-03-17` |
| LocationModal saving state | Synchronous assertion on async state | Wrap assertion with `waitFor` |

## Implementation Approach

1. **phaseDurations.test.ts**: Single line change - update expected value
2. **LocationModal.test.tsx**: Wrap the synchronous `expect` with `await waitFor(...)`
3. **Verification**: Run tests locally with `TZ=UTC` to match CI environment
4. **Regression Check**: Run 5 consecutive times to verify no flakiness
