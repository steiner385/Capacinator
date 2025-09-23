#!/bin/bash

# Run E2E tests in fully isolated environment
set -e

echo "=== Running E2E Tests in Isolated Environment ==="
echo "Starting at: $(date)"

# Create results directory
mkdir -p e2e-test-results

# Function to kill processes on ports
kill_port() {
    local port=$1
    lsof -ti :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
}

# Function to ensure ports are free
ensure_ports_free() {
    echo "Ensuring E2E ports are free..."
    kill_port 3110
    kill_port 3120
    sleep 2
}

# Function to run test batch
run_test_batch() {
    local test_file=$1
    local batch_num=$2
    
    echo -e "\n=== Test Batch $batch_num: $(basename $test_file) ==="
    
    # Ensure clean environment
    ensure_ports_free
    
    # Set E2E environment
    export NODE_ENV=e2e
    export DATABASE_URL=":memory:"
    export DB_FILENAME=":memory:"
    export PORT=3110
    export CLIENT_PORT=3120
    
    # Run the test
    npm run test:e2e -- "$test_file" --reporter=json 2>&1 > "e2e-test-results/batch-${batch_num}-$(basename $test_file .spec.ts).json" || {
        echo "✗ Test failed: $test_file"
        echo "$test_file" >> e2e-test-results/failed-tests.txt
        
        # Extract error details from JSON
        if [ -f "e2e-test-results/batch-${batch_num}-$(basename $test_file .spec.ts).json" ]; then
            jq -r '.errors[]?.message // empty' "e2e-test-results/batch-${batch_num}-$(basename $test_file .spec.ts).json" 2>/dev/null | head -5
        fi
        
        return 1
    }
    
    echo "✓ Test passed: $test_file"
    return 0
}

# Main execution
echo "Cleaning up any existing processes..."
ensure_ports_free

# Create test list excluding examples and archived
find tests/e2e -name "*.spec.ts" \
    -not -path "*/archived/*" \
    -not -path "*/examples/*" \
    -not -path "*/templates/*" | sort > e2e-test-results/test-list.txt

TOTAL_TESTS=$(wc -l < e2e-test-results/test-list.txt)
echo "Found $TOTAL_TESTS test files to run"

# Initialize counters
PASSED=0
FAILED=0
BATCH=1

# Run tests one by one
while IFS= read -r test_file; do
    if run_test_batch "$test_file" "$BATCH"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    
    ((BATCH++))
    
    # Progress update
    echo "Progress: $BATCH/$TOTAL_TESTS (Passed: $PASSED, Failed: $FAILED)"
    
done < e2e-test-results/test-list.txt

# Generate summary report
echo -e "\n=== E2E Test Summary Report ===" | tee e2e-test-results/summary.txt
echo "Total tests: $TOTAL_TESTS" | tee -a e2e-test-results/summary.txt
echo "Passed: $PASSED" | tee -a e2e-test-results/summary.txt
echo "Failed: $FAILED" | tee -a e2e-test-results/summary.txt
echo "Success rate: $(( PASSED * 100 / TOTAL_TESTS ))%" | tee -a e2e-test-results/summary.txt

if [ -f e2e-test-results/failed-tests.txt ]; then
    echo -e "\nFailed tests:" | tee -a e2e-test-results/summary.txt
    cat e2e-test-results/failed-tests.txt | tee -a e2e-test-results/summary.txt
fi

# Analyze failure patterns
if [ "$FAILED" -gt 0 ]; then
    echo -e "\n=== Failure Analysis ===" | tee e2e-test-results/failure-analysis.txt
    
    # Extract common error patterns
    echo "Common error patterns:" | tee -a e2e-test-results/failure-analysis.txt
    
    # Collect all error messages
    for json_file in e2e-test-results/batch-*.json; do
        if [ -f "$json_file" ]; then
            jq -r '.errors[]?.message // .suites[]?.suites[]?.tests[]?.results[]?.error?.message // empty' "$json_file" 2>/dev/null
        fi
    done | sort | uniq -c | sort -rn | head -10 | tee -a e2e-test-results/failure-analysis.txt
fi

echo -e "\nCompleted at: $(date)"
echo "Full results saved in: e2e-test-results/"

# Cleanup
ensure_ports_free