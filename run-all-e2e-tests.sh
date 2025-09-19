#!/bin/bash

echo "🚀 Running ALL E2E tests..."
echo "Total test files: $(find tests/e2e -name "*.spec.ts" -type f | wc -l)"
echo "Estimated test count: ~1,123"
echo ""

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:3110,3120 | xargs -r kill -9 2>/dev/null || true
sleep 2

# Set up environment
export NODE_ENV=e2e
export PORT=3110
export CLIENT_PORT=3120

# Run tests with appropriate configuration
echo "🏃 Starting test execution..."
echo "Using 4 parallel workers for better performance"
echo ""

# Run with list reporter for real-time feedback
npx playwright test tests/e2e \
  --reporter=list \
  --reporter=html \
  --workers=4 \
  --max-failures=50 \
  --timeout=90000 \
  --global-timeout=3600000

echo ""
echo "📊 Test execution complete!"
echo "HTML report available at: playwright-report/index.html"
echo ""
echo "To view the report, run: npx playwright show-report"