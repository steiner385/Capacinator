#!/bin/bash

# Script to run all scenario-related E2E tests

echo "🧪 Running Scenario Planning E2E Tests"
echo "======================================"

# Set test environment
export NODE_ENV=test
export E2E_TEST=true

# Run the scenario test suites
npx playwright test \
  tests/e2e/suites/scenarios/api-scenario-filtering.spec.ts \
  tests/e2e/suites/scenarios/ui-scenario-interactions.spec.ts \
  tests/e2e/suites/scenarios/data-isolation.spec.ts \
  tests/e2e/suites/scenarios/scenario-aware-reports.spec.ts \
  tests/e2e/suites/scenarios/scenario-edge-cases.spec.ts \
  --reporter=list \
  --retries=1 \
  --timeout=60000

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ All scenario tests passed!"
else
  echo "❌ Some scenario tests failed. Check the output above."
  exit 1
fi