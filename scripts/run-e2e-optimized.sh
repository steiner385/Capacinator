#!/bin/bash
# Optimized E2E test runner with batching and parallel execution

set -e

echo "🚀 Starting Optimized E2E Test Runner..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test results directory
RESULTS_DIR="test-results/optimized"
mkdir -p "$RESULTS_DIR"

# Function to run a test batch
run_batch() {
    local batch_name=$1
    local pattern=$2
    local start_time=$(date +%s)
    
    echo -e "\n${YELLOW}Running ${batch_name} tests...${NC}"
    
    if npx playwright test --config=tests/e2e/playwright-optimized.config.ts --project="${batch_name}" --reporter=json > "${RESULTS_DIR}/${batch_name}-results.json" 2>"${RESULTS_DIR}/${batch_name}-errors.log"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ ${batch_name} tests passed (${duration}s)${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ ${batch_name} tests failed (${duration}s)${NC}"
        return 1
    fi
}

# Function to generate summary
generate_summary() {
    echo -e "\n📊 Test Execution Summary"
    echo "========================"
    
    local total_passed=0
    local total_failed=0
    local total_skipped=0
    
    for result_file in "${RESULTS_DIR}"/*-results.json; do
        if [ -f "$result_file" ]; then
            local batch=$(basename "$result_file" -results.json)
            local stats=$(jq -r '.stats | "Passed: \(.expected) Failed: \(.unexpected) Skipped: \(.skipped)"' "$result_file" 2>/dev/null || echo "Unable to parse results")
            echo "$batch: $stats"
            
            if [ "$stats" != "Unable to parse results" ]; then
                total_passed=$((total_passed + $(jq -r '.stats.expected' "$result_file" 2>/dev/null || echo 0)))
                total_failed=$((total_failed + $(jq -r '.stats.unexpected' "$result_file" 2>/dev/null || echo 0)))
                total_skipped=$((total_skipped + $(jq -r '.stats.skipped' "$result_file" 2>/dev/null || echo 0)))
            fi
        fi
    done
    
    echo -e "\n📈 Overall Results:"
    echo "Total Passed: $total_passed"
    echo "Total Failed: $total_failed"
    echo "Total Skipped: $total_skipped"
    
    if [ $total_failed -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    else
        echo -e "\n${RED}⚠️ Some tests failed. Check ${RESULTS_DIR} for details.${NC}"
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Clean up previous results
    rm -f "${RESULTS_DIR}"/*.json "${RESULTS_DIR}"/*.log
    
    # Run test batches in order
    local failed_batches=()
    
    if ! run_batch "smoke" "smoke|quick"; then
        failed_batches+=("smoke")
    fi
    
    if ! run_batch "critical" "@critical"; then
        failed_batches+=("critical")
    fi
    
    # Only run additional tests if smoke tests pass
    if [ ${#failed_batches[@]} -eq 0 ]; then
        # Run CRUD and remaining tests in parallel
        (
            run_batch "crud" "crud/"
        ) &
        local crud_pid=$!
        
        (
            run_batch "chromium" "remaining"
        ) &
        local chromium_pid=$!
        
        # Wait for parallel tests to complete
        wait $crud_pid || failed_batches+=("crud")
        wait $chromium_pid || failed_batches+=("chromium")
    else
        echo -e "\n${YELLOW}⚠️ Skipping additional tests due to smoke/critical test failures${NC}"
    fi
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Generate summary
    generate_summary
    
    echo -e "\n⏱️ Total execution time: ${total_duration}s"
    
    # Exit with appropriate code
    if [ ${#failed_batches[@]} -eq 0 ]; then
        exit 0
    else
        echo -e "\n${RED}Failed batches: ${failed_batches[*]}${NC}"
        exit 1
    fi
}

# Check if playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Please install Node.js and npm.${NC}"
    exit 1
fi

# Run main execution
main "$@"