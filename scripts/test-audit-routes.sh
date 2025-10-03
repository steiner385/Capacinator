#!/bin/bash

echo "Testing audit routes..."

# Start server in background
NODE_ENV=e2e AUDIT_ENABLED=true PORT=3111 npx tsx src/server/index.ts &
SERVER_PID=$!

# Wait for server
sleep 5

# Test routes
echo "Testing /api/health"
curl -s http://localhost:3111/api/health | jq .

echo -e "\nTesting /api/audit/stats"
curl -s http://localhost:3111/api/audit/stats | jq .

echo -e "\nTesting /api/audit/summary/by-table"
curl -s http://localhost:3111/api/audit/summary/by-table | jq .

echo -e "\nTesting /api/audit/users/activity"
curl -s http://localhost:3111/api/audit/users/activity | jq .

# Kill server
kill $SERVER_PID 2>/dev/null || true

echo -e "\nDone"