#!/bin/bash

# Run E2E tests with detailed debugging
set -e

echo "=== E2E Test Debug Run ==="
echo "Starting at: $(date)"

# Create results directory
mkdir -p e2e-test-results

# Kill any existing processes on E2E ports
echo "Cleaning up existing processes..."
lsof -ti :3110 | xargs -r kill -9 2>/dev/null || true
lsof -ti :3120 | xargs -r kill -9 2>/dev/null || true

# Wait for ports to be freed
sleep 2

# First, let's test if the E2E server can start properly
echo "Testing E2E server startup..."
NODE_ENV=e2e npm run dev:server > e2e-test-results/server-startup.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to initialize..."
sleep 10

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✓ Server started successfully"
    
    # Test API health
    curl -s http://localhost:3110/api/health > e2e-test-results/health-check.json || echo "Health check failed"
    
    # Kill the test server
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null || true
else
    echo "✗ Server failed to start"
    cat e2e-test-results/server-startup.log
fi

# Wait for cleanup
sleep 2

# Now run E2E tests in batches
echo -e "\n=== Running E2E Tests in Batches ==="

# Create test list
find tests/e2e -name "*.spec.ts" -not -path "*/archived/*" -not -path "*/examples/*" | sort > e2e-test-results/all-tests.txt
TOTAL_TESTS=$(wc -l < e2e-test-results/all-tests.txt)
echo "Found $TOTAL_TESTS test files"

# Run tests in smaller batches
BATCH_SIZE=5
BATCH=1

while IFS= read -r test_file; do
    echo -e "\n=== Batch $BATCH: Running $test_file ==="
    
    # Run single test with detailed output
    npm run test:e2e -- "$test_file" --reporter=list 2>&1 | tee "e2e-test-results/batch-${BATCH}-$(basename $test_file).log" || {
        echo "✗ Test failed: $test_file"
        echo "$test_file" >> e2e-test-results/failed-tests.txt
    }
    
    # Clean up after each test
    lsof -ti :3110 | xargs -r kill -9 2>/dev/null || true
    lsof -ti :3120 | xargs -r kill -9 2>/dev/null || true
    sleep 2
    
    ((BATCH++))
    
    # Take a break after each batch
    if [ $((BATCH % BATCH_SIZE)) -eq 0 ]; then
        echo "Pausing between batches..."
        sleep 5
    fi
done < e2e-test-results/all-tests.txt

# Summary
echo -e "\n=== Test Run Summary ==="
if [ -f e2e-test-results/failed-tests.txt ]; then
    FAILED_COUNT=$(wc -l < e2e-test-results/failed-tests.txt)
    echo "Failed tests: $FAILED_COUNT"
    echo "Failed test files:"
    cat e2e-test-results/failed-tests.txt
else
    echo "All tests passed!"
fi

echo -e "\nCompleted at: $(date)"
echo "Results saved in: e2e-test-results/"