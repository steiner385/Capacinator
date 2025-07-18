#!/bin/bash

echo "🚀 Starting Capacinator server..."

# Create log directory
mkdir -p /tmp/capacinator-logs

# Kill any existing processes on server port
echo "🔍 Checking for existing processes on server port..."
lsof -ti:3110 | xargs -r kill -9 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Start server in background
echo "🖥️  Starting server on port 3110..."
node dist/server/index.js > /tmp/capacinator-logs/server.log 2>&1 &
SERVER_PID=$!

# Save the PID to a file for later stopping
echo $SERVER_PID > /tmp/capacinator-server.pid

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
timeout=30
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:3110/api/health > /dev/null 2>&1; then
        echo "✅ Server is ready"
        break
    fi
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo "❌ Server failed to start within ${timeout} seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ Server started in background (PID: $SERVER_PID)"
echo "🔗 Server URL: http://localhost:3110"
echo "📄 Logs are being written to: /tmp/capacinator-logs/server.log"
echo ""
echo "Commands:"
echo "  npm run server:stop  - Stop the server"
echo "  npm run server:logs  - View live logs"
echo "  tail -f /tmp/capacinator-logs/server.log - View logs directly"