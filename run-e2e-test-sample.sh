#!/bin/bash

# Run a sample of E2E tests to quickly identify common issues
set -e

echo "=== Running Sample E2E Tests ==="
echo "Starting at: $(date)"

# Create results directory
mkdir -p e2e-test-results/sample

# Kill any existing processes
echo "Cleaning up ports..."
lsof -ti :3110 2>/dev/null | xargs -r kill -9 2>/dev/null || true
lsof -ti :3120 2>/dev/null | xargs -r kill -9 2>/dev/null || true
sleep 2

# Select a diverse sample of tests
SAMPLE_TESTS=(
    "tests/e2e/00-e2e-environment-test.spec.ts"
    "tests/e2e/02-data-tables.spec.ts"
    "tests/e2e/10-fixed-import.spec.ts"
    "tests/e2e/21-write-operations.spec.ts"
    "tests/e2e/simple-table-tests.spec.ts"
    "tests/e2e/simple-utilization-report.spec.ts"
    "tests/e2e/person-details.spec.ts"
    "tests/e2e/project-type-hierarchy.spec.ts"
)

echo "Running ${#SAMPLE_TESTS[@]} sample tests..."

# Run each test
PASSED=0
FAILED=0

for test_file in "${SAMPLE_TESTS[@]}"; do
    if [ -f "$test_file" ]; then
        echo -e "\n=== Testing: $(basename $test_file) ==="
        
        # Run test with JSON reporter for structured output
        if NODE_ENV=e2e npm run test:e2e -- "$test_file" --reporter=json > "e2e-test-results/sample/$(basename $test_file .spec.ts).json" 2>&1; then
            echo "✓ PASSED"
            ((PASSED++))
        else
            echo "✗ FAILED"
            ((FAILED++))
            
            # Extract error info
            jq -r '.errors[]?.message // .suites[]?.suites[]?.tests[]?.results[]?.error?.message // empty' \
                "e2e-test-results/sample/$(basename $test_file .spec.ts).json" 2>/dev/null | head -3
        fi
        
        # Clean up
        lsof -ti :3110 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        lsof -ti :3120 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        sleep 2
    fi
done

# Summary
echo -e "\n=== Sample Test Summary ==="
echo "Total: ${#SAMPLE_TESTS[@]}"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

# Analyze common issues
if [ "$FAILED" -gt 0 ]; then
    echo -e "\n=== Common Error Patterns ==="
    
    # Collect all errors
    cat e2e-test-results/sample/*.json 2>/dev/null | \
        jq -r '.errors[]?.message // .suites[]?.suites[]?.tests[]?.results[]?.error?.message // empty' | \
        grep -v '^$' | \
        sort | uniq -c | sort -rn | head -10
fi

echo -e "\nCompleted at: $(date)"