#!/bin/bash

echo "🚀 Starting Capacinator production frontend..."

# Create log directory
mkdir -p /tmp/capacinator-logs

# Kill any existing processes on frontend port
echo "🔍 Checking for existing processes on frontend port..."
lsof -ti:5174 | xargs -r kill -9 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Build and start frontend
echo "🔧 Building frontend..."
cd client
npm run build

echo "🌐 Starting production frontend on port 5174..."
npm run preview -- --port 5174 --host > /tmp/capacinator-logs/prod-frontend.log 2>&1 &
FRONTEND_PID=$!

# Save the PID to a file for later stopping
echo $FRONTEND_PID > /tmp/capacinator-frontend.pid

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
timeout=30
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:5174 > /dev/null 2>&1; then
        echo "✅ Production frontend is ready"
        break
    fi
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo "❌ Production frontend failed to start within ${timeout} seconds"
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ Production frontend started in background (PID: $FRONTEND_PID)"
echo "🔗 Frontend URL: http://localhost:5174"
echo "📄 Logs are being written to: /tmp/capacinator-logs/prod-frontend.log"
echo ""
echo "Commands:"
echo "  npm run prod:frontend:stop  - Stop the frontend server"
echo "  npm run prod:frontend:logs  - View live logs"
echo "  tail -f /tmp/capacinator-logs/prod-frontend.log - View logs directly"