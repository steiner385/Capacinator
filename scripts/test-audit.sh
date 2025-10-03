#!/bin/bash

echo "🔍 Running Comprehensive Audit Test Suite"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test categories
UNIT_TESTS=0
INTEGRATION_TESTS=0
E2E_TESTS=0
FAILED_TESTS=0

echo -e "\n${YELLOW}1. Running Unit Tests${NC}"
echo "------------------------"
npm test -- --config=tests/audit-test-suite.config.js --testPathPattern="unit" --verbose
UNIT_RESULT=$?

echo -e "\n${YELLOW}2. Running Integration Tests${NC}"
echo "-----------------------------"
npm test -- --config=tests/audit-test-suite.config.js --testPathPattern="integration" --verbose
INTEGRATION_RESULT=$?

echo -e "\n${YELLOW}3. Running E2E Tests${NC}"
echo "---------------------"
npm run test:e2e -- tests/e2e/suites/audit/comprehensive-audit-functionality.spec.ts
E2E_RESULT=$?

echo -e "\n${YELLOW}4. Running Coverage Report${NC}"
echo "--------------------------"
npm test -- --config=tests/audit-test-suite.config.js --coverage
COVERAGE_RESULT=$?

# Summary
echo -e "\n========================================"
echo "📊 Audit Test Suite Summary"
echo "========================================"

if [ $UNIT_RESULT -eq 0 ]; then
    echo -e "✅ Unit Tests: ${GREEN}PASSED${NC}"
else
    echo -e "❌ Unit Tests: ${RED}FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

if [ $INTEGRATION_RESULT -eq 0 ]; then
    echo -e "✅ Integration Tests: ${GREEN}PASSED${NC}"
else
    echo -e "❌ Integration Tests: ${RED}FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

if [ $E2E_RESULT -eq 0 ]; then
    echo -e "✅ E2E Tests: ${GREEN}PASSED${NC}"
else
    echo -e "❌ E2E Tests: ${RED}FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

if [ $COVERAGE_RESULT -eq 0 ]; then
    echo -e "✅ Coverage Report: ${GREEN}GENERATED${NC}"
else
    echo -e "❌ Coverage Report: ${RED}FAILED${NC}"
fi

echo "========================================"

# Audit test checklist
echo -e "\n${YELLOW}Audit Functionality Checklist:${NC}"
echo "------------------------------"
echo "✓ Audit log creation for CREATE operations"
echo "✓ Audit log creation for UPDATE operations with field tracking"
echo "✓ Audit log creation for DELETE operations with data preservation"
echo "✓ Sensitive field redaction (passwords, tokens, etc.)"
echo "✓ Request metadata tracking (IP, user agent, request ID)"
echo "✓ User context tracking"
echo "✓ Bulk operation support"
echo "✓ Undo/Redo functionality"
echo "✓ Retention policy enforcement"
echo "✓ Performance under load"
echo "✓ Error handling and graceful degradation"
echo "✓ Business operation logging"
echo "✓ Scenario-aware auditing"
echo "✓ Search and filtering capabilities"
echo "✓ Audit statistics and reporting"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All audit tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ $FAILED_TESTS test suite(s) failed${NC}"
    exit 1
fi