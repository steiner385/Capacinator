#!/bin/bash

# Script to run E2E audit tests with proper server setup

echo "🚀 Starting E2E Audit Tests..."

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Export environment variables for E2E testing
export NODE_ENV=e2e
export DATABASE_URL=":memory:"
export PORT=3110
export CLIENT_PORT=3120
export BASE_URL="http://localhost:3120"

# Kill any existing servers
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx src/server/index.ts" || true
pkill -f "vite --config client-vite.config.ts" || true
sleep 2

# Start the server in the background
echo "🚀 Starting server on port 3110..."
npx tsx src/server/index.ts &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
  if curl -s http://localhost:3110/api/health > /dev/null; then
    echo "✅ Server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server failed to start within 30 seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Start the client in the background
echo "🚀 Starting client on port 3120..."
npx vite --config client-vite.config.ts &
CLIENT_PID=$!

# Wait for client to start
echo "⏳ Waiting for client to start..."
for i in {1..30}; do
  if curl -s http://localhost:3120 > /dev/null; then
    echo "✅ Client is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Client failed to start within 30 seconds"
    kill $SERVER_PID $CLIENT_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Run the E2E tests
echo "🧪 Running E2E audit tests..."
npm run test:e2e -- tests/e2e/suites/audit/comprehensive-audit-functionality.spec.ts

# Capture the exit code
TEST_EXIT_CODE=$?

# Clean up
echo "🧹 Cleaning up..."
kill $SERVER_PID $CLIENT_PID 2>/dev/null || true

# Exit with the test exit code
exit $TEST_EXIT_CODE