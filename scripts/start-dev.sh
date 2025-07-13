#!/bin/bash

echo "🚀 Starting Capacinator development environment..."

# Create log directory
mkdir -p /tmp/capacinator-logs

# Start the development servers in background with logging
concurrently "npm run dev:server" "npm run dev:client" > /tmp/capacinator-logs/dev.log 2>&1 &
DEV_PID=$!

# Save the PID to a file for later stopping
echo $DEV_PID > /tmp/capacinator-dev.pid

# Wait a moment for servers to start
sleep 2

echo ""
echo "✅ Development servers started in background (PID: $DEV_PID)"
echo "📄 Logs are being written to: /tmp/capacinator-logs/dev.log"
echo ""
echo "Commands:"
echo "  npm run dev:stop  - Stop the servers"
echo "  npm run dev:logs  - View live logs"
echo "  tail -f /tmp/capacinator-logs/dev.log - View logs directly"