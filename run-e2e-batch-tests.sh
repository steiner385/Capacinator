#!/bin/bash

# Run E2E tests in batches and collect results
set -e

echo "=== Running E2E Tests in Batches ==="
echo "Starting at: $(date)"

# Create results directory
mkdir -p e2e-test-results/batches

# Kill any existing processes
echo "Cleaning up existing processes..."
lsof -ti :3110 2>/dev/null | xargs -r kill -9 2>/dev/null || true
lsof -ti :3120 2>/dev/null | xargs -r kill -9 2>/dev/null || true
sleep 2

# Get all test files
find tests/e2e -name "*.spec.ts" \
    -not -path "*/archived/*" \
    -not -path "*/examples/*" \
    -not -path "*/templates/*" | sort > e2e-test-results/test-files.txt

TOTAL_TESTS=$(wc -l < e2e-test-results/test-files.txt)
echo "Found $TOTAL_TESTS test files"

# Initialize counters
PASSED=0
FAILED=0
BATCH_NUM=0

# Process tests in batches of 10
BATCH_SIZE=10
CURRENT_BATCH=()

while IFS= read -r test_file; do
    CURRENT_BATCH+=("$test_file")
    
    # Run batch when it reaches the size limit or on last test
    if [ ${#CURRENT_BATCH[@]} -eq $BATCH_SIZE ] || [ "$test_file" == "$(tail -1 e2e-test-results/test-files.txt)" ]; then
        ((BATCH_NUM++))
        echo -e "\n=== Batch $BATCH_NUM (${#CURRENT_BATCH[@]} tests) ==="
        
        # Clean ports before each batch
        lsof -ti :3110 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        lsof -ti :3120 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        sleep 2
        
        # Run the batch
        BATCH_FILE="e2e-test-results/batches/batch-${BATCH_NUM}.json"
        
        if NODE_ENV=e2e npm run test:e2e -- "${CURRENT_BATCH[@]}" --reporter=json > "$BATCH_FILE" 2>&1; then
            # Count passed tests
            BATCH_PASSED=$(jq '.stats.expected // 0' "$BATCH_FILE" 2>/dev/null || echo 0)
            PASSED=$((PASSED + BATCH_PASSED))
            echo "✓ Batch passed: $BATCH_PASSED tests"
        else
            # Count failed tests
            BATCH_FAILED=$(jq '.stats.unexpected // 0' "$BATCH_FILE" 2>/dev/null || echo ${#CURRENT_BATCH[@]})
            FAILED=$((FAILED + BATCH_FAILED))
            echo "✗ Batch had failures: $BATCH_FAILED tests"
            
            # Show error summary
            jq -r '.errors[]?.message // empty' "$BATCH_FILE" 2>/dev/null | head -3
        fi
        
        # Reset batch
        CURRENT_BATCH=()
        
        # Clean up processes
        lsof -ti :3110 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        lsof -ti :3120 2>/dev/null | xargs -r kill -9 2>/dev/null || true
        sleep 2
    fi
done < e2e-test-results/test-files.txt

# Generate summary
echo -e "\n=== E2E Test Summary ==="
echo "Total test files: $TOTAL_TESTS"
echo "Total batches run: $BATCH_NUM"
echo "Tests passed: $PASSED"
echo "Tests failed: $FAILED"

# Consolidate results
echo -e "\n=== Consolidating Results ==="
jq -s '{
    totalFiles: length,
    totalTests: (map(.stats.expected // 0) | add),
    passed: (map(.stats.expected // 0) | add),
    failed: (map(.stats.unexpected // 0) | add),
    errors: (map(.errors[]? // empty) | unique)
}' e2e-test-results/batches/*.json > e2e-test-results/consolidated-results.json 2>/dev/null || true

echo -e "\nCompleted at: $(date)"
echo "Results saved in: e2e-test-results/"