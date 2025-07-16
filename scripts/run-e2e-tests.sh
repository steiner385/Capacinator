#!/bin/bash

# E2E Test Runner for Capacinator
# This script runs all E2E tests against the dev environment

echo "🧪 Running Capacinator E2E Tests"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://dev.capacinator.com}"
HEADLESS="${HEADLESS:-true}"

echo "📍 Target URL: $BASE_URL"
echo "🖥️  Headless: $HEADLESS"
echo ""

# Check if server is running
echo -n "🔍 Checking server health... "
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" | grep -q "200"; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
else
    echo -e "${RED}✗ Server is not responding${NC}"
    exit 1
fi

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_file=$2
    
    echo ""
    echo "🧪 Running: $suite_name"
    echo "   File: $test_file"
    
    if [ "$HEADLESS" = "false" ]; then
        npx playwright test "$test_file" --headed
    else
        npx playwright test "$test_file"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓ PASSED${NC}"
        return 0
    else
        echo -e "   ${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run each test suite
echo ""
echo "🚀 Starting test execution..."
echo "================================"

# Core functionality tests
if run_test_suite "Navigation & Structure" "e2e/01-navigation.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Read operations
if run_test_suite "Read Operations" "e2e/20-read-operations.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Write operations
if run_test_suite "Write Operations (CRUD)" "e2e/21-write-operations.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Reporting
if run_test_suite "Reporting & Analytics" "e2e/22-reporting-operations.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Navigation & Links
if run_test_suite "Navigation & Hyperlinks" "e2e/23-navigation-hyperlinks.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Data relationships
if run_test_suite "Data Relationships" "e2e/24-data-relationships.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Excel import
if run_test_suite "Excel Import" "e2e/03-excel-import.spec.ts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Summary
echo ""
echo "================================"
echo "📊 Test Results Summary"
echo "================================"
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed!${NC}"
    
    # Generate report
    echo ""
    echo "📄 Generating detailed report..."
    npx playwright show-report
    
    exit 1
fi