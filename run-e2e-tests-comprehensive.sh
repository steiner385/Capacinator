#!/bin/bash
# Comprehensive E2E test runner with detailed logging

# Set up test environment
export NODE_ENV=e2e
export TEST_RUN_ID="e2e-$(date +%Y%m%d-%H%M%S)"
export TEST_DIR="/home/tony/GitHub/Capacinator/e2e-test-results/${TEST_RUN_ID}"

# Create results directory
mkdir -p "$TEST_DIR"
mkdir -p "$TEST_DIR/logs"
mkdir -p "$TEST_DIR/results"
mkdir -p "$TEST_DIR/failures"

echo "🚀 Capacinator E2E Test Run" | tee "$TEST_DIR/master.log"
echo "=========================" | tee -a "$TEST_DIR/master.log"
echo "Run ID: $TEST_RUN_ID" | tee -a "$TEST_DIR/master.log"
echo "Started: $(date)" | tee -a "$TEST_DIR/master.log"
echo "Results Directory: $TEST_DIR" | tee -a "$TEST_DIR/master.log"
echo "" | tee -a "$TEST_DIR/master.log"

# Function to run tests and capture results
run_test_suite() {
    local suite_name=$1
    local test_files=$2
    local suite_log="$TEST_DIR/logs/${suite_name}.log"
    local suite_json="$TEST_DIR/results/${suite_name}.json"
    local suite_html="$TEST_DIR/results/${suite_name}.html"
    
    echo "🧪 Running ${suite_name}..." | tee -a "$TEST_DIR/master.log"
    echo "Test files: ${test_files}" | tee -a "$TEST_DIR/master.log"
    
    # Run tests with multiple reporters
    npx playwright test ${test_files} \
        --reporter=json \
        --reporter=html \
        --reporter=line \
        > "${suite_json}" \
        2> "${suite_log}"
    
    local exit_code=$?
    
    # Analyze results
    if [ $exit_code -eq 0 ]; then
        echo "✅ ${suite_name}: PASSED" | tee -a "$TEST_DIR/master.log"
    else
        echo "❌ ${suite_name}: FAILED (exit code: $exit_code)" | tee -a "$TEST_DIR/master.log"
        
        # Extract failure details
        if [ -f "${suite_json}" ]; then
            # Parse failures from JSON
            cat "${suite_json}" | jq -r '
                .suites[]?.suites[]?.specs[]? | 
                select(.tests[]?.results[]?.status == "failed") |
                "  ❌ \(.title) in \(.file)"
            ' 2>/dev/null >> "$TEST_DIR/failures/${suite_name}-failures.txt"
        fi
    fi
    
    # Extract statistics
    if [ -f "${suite_json}" ]; then
        local stats=$(cat "${suite_json}" | jq -r '.stats' 2>/dev/null)
        if [ ! -z "$stats" ] && [ "$stats" != "null" ]; then
            echo "  📊 Stats:" | tee -a "$TEST_DIR/master.log"
            echo "$stats" | jq -r '
                "    Total: \(.expected + .unexpected + .flaky + .skipped)",
                "    ✅ Passed: \(.expected)",
                "    ❌ Failed: \(.unexpected)",
                "    🔄 Flaky: \(.flaky)",
                "    ⏭️ Skipped: \(.skipped)"
            ' 2>/dev/null | tee -a "$TEST_DIR/master.log"
        fi
    fi
    
    echo "" | tee -a "$TEST_DIR/master.log"
    return $exit_code
}

# Check E2E servers
echo "🔍 Checking E2E servers..." | tee -a "$TEST_DIR/master.log"
if curl -s http://localhost:3110/api/health > /dev/null 2>&1; then
    echo "✅ E2E backend server is running" | tee -a "$TEST_DIR/master.log"
else
    echo "❌ E2E backend server is not running!" | tee -a "$TEST_DIR/master.log"
    echo "Please start the E2E servers first: npm run e2e:start" | tee -a "$TEST_DIR/master.log"
    exit 1
fi

if curl -s http://localhost:3120 > /dev/null 2>&1; then
    echo "✅ E2E frontend server is running" | tee -a "$TEST_DIR/master.log"
else
    echo "❌ E2E frontend server is not running!" | tee -a "$TEST_DIR/master.log"
    echo "Please start the E2E servers first: npm run e2e:start" | tee -a "$TEST_DIR/master.log"
    exit 1
fi

echo "" | tee -a "$TEST_DIR/master.log"

# Run all test suites
echo "🧪 Starting test execution..." | tee -a "$TEST_DIR/master.log"
echo "==============================" | tee -a "$TEST_DIR/master.log"
echo "" | tee -a "$TEST_DIR/master.log"

# Track overall results
total_suites=0
passed_suites=0
failed_suites=0

# Core functionality tests
run_test_suite "01-server-health" "tests/e2e/00-server-health.spec.ts tests/e2e/00-e2e-environment-test.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Basic operations
run_test_suite "02-basic-operations" "tests/e2e/0[5-9]-*.spec.ts tests/e2e/1*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# CRUD operations
run_test_suite "03-read-operations" "tests/e2e/20-read-operations.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

run_test_suite "04-write-operations" "tests/e2e/21-write-operations.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Data relationships
run_test_suite "05-data-relationships" "tests/e2e/24-data-relationships.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Smoke tests
run_test_suite "06-smoke-tests" "tests/e2e/25-quick-smoke-test.spec.ts tests/e2e/smoke-test.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# API tests
run_test_suite "07-api-endpoints" "tests/e2e/99-api-endpoints.spec.ts tests/e2e/api-*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Feature tests
run_test_suite "08-crud-suite" "tests/e2e/suites/crud/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

run_test_suite "09-features-dashboard" "tests/e2e/suites/features/dashboard/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

run_test_suite "10-features-phases" "tests/e2e/suites/features/phases/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

run_test_suite "11-features-import-export" "tests/e2e/suites/features/import-export/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Reports
run_test_suite "12-reports" "tests/e2e/suites/reports/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Scenarios
run_test_suite "13-scenarios" "tests/e2e/suites/scenarios/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Integration tests
run_test_suite "14-integration" "tests/e2e/suites/integration/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Security tests
run_test_suite "15-security" "tests/e2e/suites/security/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Performance tests
run_test_suite "16-performance" "tests/e2e/suites/performance/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Tables
run_test_suite "17-tables" "tests/e2e/suites/tables/*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Other standalone tests
run_test_suite "18-standalone-tests" "tests/e2e/[a-z]*.spec.ts"
[ $? -eq 0 ] && ((passed_suites++)) || ((failed_suites++))
((total_suites++))

# Generate final summary
echo "" | tee -a "$TEST_DIR/master.log"
echo "📊 FINAL TEST SUMMARY" | tee -a "$TEST_DIR/master.log"
echo "===================" | tee -a "$TEST_DIR/master.log"
echo "Total test suites: $total_suites" | tee -a "$TEST_DIR/master.log"
echo "✅ Passed: $passed_suites" | tee -a "$TEST_DIR/master.log"
echo "❌ Failed: $failed_suites" | tee -a "$TEST_DIR/master.log"
echo "" | tee -a "$TEST_DIR/master.log"
echo "Completed: $(date)" | tee -a "$TEST_DIR/master.log"
echo "" | tee -a "$TEST_DIR/master.log"

# Create failure summary if there are failures
if [ $failed_suites -gt 0 ]; then
    echo "❌ FAILURE SUMMARY" | tee -a "$TEST_DIR/master.log"
    echo "=================" | tee -a "$TEST_DIR/master.log"
    
    for failure_file in "$TEST_DIR/failures"/*-failures.txt; do
        if [ -f "$failure_file" ]; then
            suite_name=$(basename "$failure_file" | sed 's/-failures.txt//')
            echo "" | tee -a "$TEST_DIR/master.log"
            echo "Suite: $suite_name" | tee -a "$TEST_DIR/master.log"
            cat "$failure_file" | tee -a "$TEST_DIR/master.log"
        fi
    done
fi

# Save environment info
echo "" | tee -a "$TEST_DIR/master.log"
echo "📋 ENVIRONMENT INFO" | tee -a "$TEST_DIR/master.log"
echo "==================" | tee -a "$TEST_DIR/master.log"
echo "Node version: $(node --version)" | tee -a "$TEST_DIR/master.log"
echo "NPM version: $(npm --version)" | tee -a "$TEST_DIR/master.log"
echo "Playwright version: $(npx playwright --version)" | tee -a "$TEST_DIR/master.log"
echo "" | tee -a "$TEST_DIR/master.log"

# Create quick access summary
cat > "$TEST_DIR/SUMMARY.md" << EOF
# E2E Test Results - $TEST_RUN_ID

## Overview
- **Total Suites**: $total_suites
- **Passed**: $passed_suites
- **Failed**: $failed_suites
- **Success Rate**: $(( passed_suites * 100 / total_suites ))%

## Results Location
- Master Log: $TEST_DIR/master.log
- Individual Logs: $TEST_DIR/logs/
- JSON Results: $TEST_DIR/results/
- Failure Details: $TEST_DIR/failures/

## Quick Commands
\`\`\`bash
# View master log
cat $TEST_DIR/master.log

# View specific suite log
cat $TEST_DIR/logs/<suite-name>.log

# View failures
cat $TEST_DIR/failures/*-failures.txt
\`\`\`
EOF

echo "✅ Test run complete!" | tee -a "$TEST_DIR/master.log"
echo "" | tee -a "$TEST_DIR/master.log"
echo "📁 Results saved to: $TEST_DIR" | tee -a "$TEST_DIR/master.log"
echo "📄 View summary: cat $TEST_DIR/SUMMARY.md" | tee -a "$TEST_DIR/master.log"