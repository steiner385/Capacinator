#\!/bin/bash

# Final E2E Test Runner

echo "=== Running Final E2E Test Suite ==="
echo "Start time: $(date)"

# Create results directory
RESULTS_DIR="e2e-test-results/final-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Clean up
rm -rf test-results/*

# Run tests
echo "Running write operations tests..."
npm run test:e2e -- tests/e2e/21-write-operations.spec.ts --reporter=json 2>&1 > "$RESULTS_DIR/write-ops-results.json"

# Parse results
if [ -f "$RESULTS_DIR/write-ops-results.json" ]; then
    sed -i '1,/{/{ /^{/\!d }' "$RESULTS_DIR/write-ops-results.json"
    
    echo "=== Test Results Summary ===" > "$RESULTS_DIR/summary.txt"
    
    # Extract stats
    if command -v jq &> /dev/null; then
        jq -r '.stats  < /dev/null |  "Total: \(.tests), Passed: \(.passed), Failed: \(.failed)"' \
            "$RESULTS_DIR/write-ops-results.json" >> "$RESULTS_DIR/summary.txt" 2>/dev/null
        
        echo "" >> "$RESULTS_DIR/summary.txt"
        echo "Failed tests:" >> "$RESULTS_DIR/summary.txt"
        jq -r '.suites[] | .. | objects | select(.ok == false and .title) | .title' \
            "$RESULTS_DIR/write-ops-results.json" >> "$RESULTS_DIR/summary.txt" 2>/dev/null
    fi
fi

# Show summary
cat "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "No summary generated"

echo ""
echo "Results saved to: $RESULTS_DIR"
