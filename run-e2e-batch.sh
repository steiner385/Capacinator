#\!/bin/bash

# Run E2E tests in batches with timeout

echo "=== Running E2E Tests in Batches ==="
echo "Start time: $(date)"

# Create results directory
RESULTS_DIR="e2e-test-results/batch-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Clean up
rm -rf test-results/*

# First, let's run a quick test to see current state
echo "Running quick smoke test..."
timeout 300 npm run test:e2e -- tests/e2e/25-quick-smoke-test.spec.ts --reporter=list 2>&1  < /dev/null |  tee "$RESULTS_DIR/smoke-test.log"

echo ""
echo "Running critical write operations test..."
timeout 300 npm run test:e2e -- tests/e2e/21-write-operations.spec.ts --reporter=list 2>&1 | tee "$RESULTS_DIR/write-operations.log"

echo ""
echo "Getting test summary..."
find test-results -name "test-failed-*.png" -type f 2>/dev/null | wc -l > "$RESULTS_DIR/failed-count.txt"

echo "Results saved to: $RESULTS_DIR"
