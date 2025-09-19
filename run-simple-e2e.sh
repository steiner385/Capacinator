#!/bin/bash

echo "🧪 Running simple E2E test to verify profile selection fixes..."

# Kill any existing processes on the ports
echo "🧹 Cleaning up ports..."
lsof -ti:3110,3120 | xargs -r kill -9 2>/dev/null || true
sleep 1

# Run a simple test with the original config
echo "🚀 Running test..."
NODE_ENV=e2e PORT=3110 CLIENT_PORT=3120 npx playwright test tests/e2e/02-data-tables.spec.ts --reporter=list --project=chromium -g "should navigate between pages"

echo "✅ Test complete!"