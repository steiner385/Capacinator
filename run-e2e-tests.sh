#!/bin/bash

# E2E Test Runner Script
# This script runs the standardized E2E tests

echo "🚀 Starting E2E Test Suite..."
echo "================================"

# Ensure we're in the right directory
cd /home/tony/GitHub/Capacinator

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run different test suites based on argument
case "$1" in
    "smoke")
        echo "🔥 Running smoke tests..."
        npm run test:e2e:smoke
        ;;
    "crud")
        echo "📝 Running CRUD tests..."
        npx playwright test tests/e2e/suites/crud --reporter=list
        ;;
    "reports")
        echo "📊 Running report tests..."
        npx playwright test tests/e2e/suites/reports --reporter=list
        ;;
    "tables")
        echo "📋 Running table tests..."
        npx playwright test tests/e2e/suites/tables --reporter=list
        ;;
    "all")
        echo "🎯 Running all E2E tests..."
        npm run test:e2e
        ;;
    "ui")
        echo "🖥️  Opening Playwright UI..."
        npx playwright test --ui
        ;;
    *)
        echo "Usage: ./run-e2e-tests.sh [smoke|crud|reports|tables|all|ui]"
        echo ""
        echo "Options:"
        echo "  smoke   - Run quick smoke tests"
        echo "  crud    - Run CRUD operation tests"
        echo "  reports - Run report functionality tests"
        echo "  tables  - Run table-specific tests"
        echo "  all     - Run all E2E tests"
        echo "  ui      - Open Playwright UI mode"
        echo ""
        echo "Running smoke tests by default..."
        npm run test:e2e:smoke
        ;;
esac

echo ""
echo "✅ Test run complete!"