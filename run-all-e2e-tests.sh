#\!/bin/bash

# E2E Test Runner with Comprehensive Logging
# This script runs all E2E tests and captures detailed results

echo "=== Starting Complete E2E Test Suite ==="
echo "Start time: $(date)"
echo ""

# Create results directory
RESULTS_DIR="e2e-test-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Clean up any existing test results
rm -rf test-results/*

# Export environment variables for better test stability
export PWTEST_SKIP_TEST_OUTPUT=1
export CI=true

# Run all E2E tests with JSON reporter for analysis
echo "Running all E2E tests..."
npm run test:e2e -- --reporter=json 2>&1  < /dev/null |  tee "$RESULTS_DIR/full-test-run.log" > "$RESULTS_DIR/test-results.json"

# Extract summary from JSON results
if [ -f "$RESULTS_DIR/test-results.json" ]; then
    # Remove any non-JSON content before the first {
    sed -i '1,/{/{ /^{/\!d }' "$RESULTS_DIR/test-results.json"
    
    # Generate summary
    echo "=== Test Summary ===" > "$RESULTS_DIR/summary.txt"
    echo "Generated at: $(date)" >> "$RESULTS_DIR/summary.txt"
    echo "" >> "$RESULTS_DIR/summary.txt"
    
    # Use jq to parse results if available
    if command -v jq &> /dev/null; then
        jq -r '.stats | "Total Tests: \(.tests)\nPassed: \(.passed)\nFailed: \(.failed)\nSkipped: \(.skipped)\nDuration: \(.duration / 1000)s"' \
            "$RESULTS_DIR/test-results.json" >> "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "Could not parse JSON results" >> "$RESULTS_DIR/summary.txt"
        
        echo "" >> "$RESULTS_DIR/summary.txt"
        echo "=== Failed Tests ===" >> "$RESULTS_DIR/summary.txt"
        
        # List all failed tests
        jq -r '.suites[] | .. | objects | select(.ok == false and .tests) | "\(.file // "Unknown file"): \(.title)"' \
            "$RESULTS_DIR/test-results.json" >> "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "Could not extract failed tests" >> "$RESULTS_DIR/summary.txt"
    else
        echo "jq not installed - cannot parse JSON results" >> "$RESULTS_DIR/summary.txt"
    fi
fi

# Copy any test failure screenshots
echo "" >> "$RESULTS_DIR/summary.txt"
echo "=== Failure Screenshots ===" >> "$RESULTS_DIR/summary.txt"
find test-results -name "test-failed-*.png" -type f 2>/dev/null | while read -r screenshot; do
    echo "Found: $screenshot" >> "$RESULTS_DIR/summary.txt"
    cp "$screenshot" "$RESULTS_DIR/" 2>/dev/null
done

# Generate a list of all test files
echo "" >> "$RESULTS_DIR/summary.txt"
echo "=== Test Files ===" >> "$RESULTS_DIR/summary.txt"
find tests/e2e -name "*.spec.ts" -type f | sort >> "$RESULTS_DIR/summary.txt"

echo ""
echo "Test run complete. Results saved to: $RESULTS_DIR"
echo "Summary available at: $RESULTS_DIR/summary.txt"
echo "Full log available at: $RESULTS_DIR/full-test-run.log"
echo "JSON results at: $RESULTS_DIR/test-results.json"
