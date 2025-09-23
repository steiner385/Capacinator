#!/bin/bash

# Start E2E Server Script
# This script starts the server with E2E-specific configuration

set -e

echo "🚀 Starting E2E Server Environment..."

# Create log directory
mkdir -p /tmp/capacinator-logs

# Load E2E environment variables
export $(cat .env.e2e | grep -v '^#' | sed 's/#.*//' | grep -v '^$' | xargs)

# Kill any existing processes on E2E ports
echo "🔍 Checking for existing processes on E2E ports..."
# Read ports from .env.e2e
E2E_PORT=${PORT:-3110}
E2E_CLIENT_PORT=${CLIENT_PORT:-3120}
echo "   Backend port: $E2E_PORT"
echo "   Frontend port: $E2E_CLIENT_PORT"
lsof -ti:$E2E_PORT | xargs -r kill -9 2>/dev/null || true
lsof -ti:$E2E_CLIENT_PORT | xargs -r kill -9 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Start backend server in E2E mode (database will be initialized automatically)
echo "🖥️  Starting E2E backend server on port $E2E_PORT..."
NODE_ENV=e2e PORT=$E2E_PORT npx tsx src/server/index.ts > /tmp/capacinator-logs/e2e-backend.log 2>&1 &
E2E_SERVER_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for E2E backend server to be ready..."
timeout=30
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:$E2E_PORT/api/health > /dev/null 2>&1; then
        echo "✅ E2E backend server is ready"
        break
    fi
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo "❌ E2E backend server failed to start within ${timeout} seconds"
    kill $E2E_SERVER_PID 2>/dev/null || true
    exit 1
fi

# Create local environment override for Vite E2E mode
echo "🔧 Creating Vite environment override for E2E..."
cat > .env.local << EOF
NODE_ENV=e2e
EOF

# Start frontend server in E2E mode
echo "🌐 Starting E2E frontend server on port $E2E_CLIENT_PORT..."
NODE_ENV=e2e VITE_API_URL=http://localhost:$E2E_PORT npx vite --port $E2E_CLIENT_PORT --host --config client-vite.config.ts > /tmp/capacinator-logs/e2e-frontend.log 2>&1 &
E2E_FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for E2E frontend server to be ready..."
timeout=30
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:$E2E_CLIENT_PORT > /dev/null 2>&1; then
        echo "✅ E2E frontend server is ready"
        break
    fi
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo "❌ E2E frontend server failed to start within ${timeout} seconds"
    kill $E2E_SERVER_PID 2>/dev/null || true
    kill $E2E_FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ E2E environment is ready!"
echo "🔗 Backend URL: http://localhost:$E2E_PORT"
echo "🔗 Frontend URL: http://localhost:$E2E_CLIENT_PORT"
echo "📝 Process IDs: Backend=$E2E_SERVER_PID, Frontend=$E2E_FRONTEND_PID"

# Store PIDs for cleanup
echo $E2E_SERVER_PID > /tmp/e2e-backend.pid
echo $E2E_FRONTEND_PID > /tmp/e2e-frontend.pid
echo "$E2E_SERVER_PID,$E2E_FRONTEND_PID" > /tmp/e2e-servers.pid

echo ""
echo "✅ E2E servers started in background"
echo "📄 Backend PID: $E2E_SERVER_PID"
echo "📄 Frontend PID: $E2E_FRONTEND_PID"
echo "📄 Backend logs: /tmp/capacinator-logs/e2e-backend.log"
echo "📄 Frontend logs: /tmp/capacinator-logs/e2e-frontend.log"
echo ""
echo "Commands:"
echo "  npm run e2e:stop  - Stop the E2E servers"
echo "  npm run e2e:stop:cleanup  - Stop and cleanup database"
echo "  npm run e2e:logs  - View live logs"