#!/bin/bash

echo "🚀 Starting Capacinator production environment..."

# Create log directory
mkdir -p /tmp/capacinator-logs

# Kill any existing processes on production ports
echo "🔍 Checking for existing processes on production ports..."
lsof -ti:3110 | xargs -r kill -9 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Start production server in background
echo "🖥️  Starting production server on port 3110..."
NODE_ENV=production tsx src/server/index.ts > /tmp/capacinator-logs/prod.log 2>&1 &
PROD_PID=$!

# Save the PID to a file for later stopping
echo $PROD_PID > /tmp/capacinator-prod.pid

# Wait for server to be ready
echo "⏳ Waiting for production server to be ready..."
timeout=30
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:3110/api/health > /dev/null 2>&1; then
        echo "✅ Production server is ready"
        break
    fi
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo "❌ Production server failed to start within ${timeout} seconds"
    kill $PROD_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ Production server started in background (PID: $PROD_PID)"
echo "🔗 Server URL: http://localhost:3110"
echo "📄 Logs are being written to: /tmp/capacinator-logs/prod.log"
echo ""
echo "Commands:"
echo "  npm run prod:stop  - Stop the production server"
echo "  npm run prod:logs  - View live logs"
echo "  tail -f /tmp/capacinator-logs/prod.log - View logs directly"