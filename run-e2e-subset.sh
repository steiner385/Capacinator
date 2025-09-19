#!/bin/bash
# Run a subset of E2E tests for verification

echo "Running E2E test subset..."

# Kill any existing processes
ps aux | grep -E "(tsx|vite)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Run specific test suites that are most important
npm run test:e2e -- \
  tests/e2e/suites/smoke/smoke-tests.spec.ts \
  tests/e2e/suites/api/assignment-contracts.spec.ts \
  tests/e2e/20-read-operations.spec.ts \
  tests/e2e/21-write-operations.spec.ts \
  --workers=1 \
  --timeout=180000