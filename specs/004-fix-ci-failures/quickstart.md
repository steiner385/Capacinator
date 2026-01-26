# Quickstart: Fix CI Test Failures

**Feature**: 004-fix-ci-failures

## Prerequisites

- Node.js 20+
- npm dependencies installed (`npm install`)

## Running the Affected Tests

### Run phaseDurations Tests

```bash
npm test -- client/src/utils/__tests__/phaseDurations.test.ts
```

### Run LocationModal Tests

```bash
npm test -- client/src/components/modals/__tests__/LocationModal.test.tsx
```

### Run Both Tests Together

```bash
npm test -- client/src/utils/__tests__/phaseDurations.test.ts client/src/components/modals/__tests__/LocationModal.test.tsx
```

## Verification Steps

### 1. Test in UTC Timezone (mimics CI)

```bash
TZ=UTC npm test -- client/src/utils/__tests__/phaseDurations.test.ts
```

### 2. Test in Different Timezone

```bash
TZ=America/Los_Angeles npm test -- client/src/utils/__tests__/phaseDurations.test.ts
```

### 3. Verify No Flakiness (5 consecutive runs)

```bash
for i in {1..5}; do
  echo "=== Run $i ==="
  npm test -- client/src/components/modals/__tests__/LocationModal.test.tsx 2>&1 | grep -E "^(PASS|FAIL|Tests:)"
done
```

### 4. Run Full Smoke Test Suite

```bash
npm test -- --project=smoke
```

## Expected Results After Fix

- `phaseDurations.test.ts`: All 14 tests pass
- `LocationModal.test.tsx`: All 22 tests pass
- No timezone-dependent failures
- No flaky tests (100% pass rate over 5 runs)

## Troubleshooting

### Test still fails with different date?

Ensure you're using the correct expected value:
- `2025-01-20` + 56 days = `2025-03-17` (not `2025-03-16`)

### LocationModal test times out?

Increase Jest timeout if needed:
```javascript
jest.setTimeout(10000); // 10 seconds
```

### Tests pass locally but fail in CI?

Run with `TZ=UTC` to match CI environment.
