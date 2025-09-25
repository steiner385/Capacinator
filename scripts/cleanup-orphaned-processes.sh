#!/bin/bash

echo "🧹 Cleaning up orphaned Capacinator processes..."

# Find and kill orphaned Vite processes
echo "Checking for orphaned Vite processes..."
VITE_PIDS=$(ps aux | grep -E "vite.*client-vite.config.ts" | grep -v grep | awk '{print $2}' || true)
if [ -n "$VITE_PIDS" ]; then
    echo "Found orphaned Vite processes: $VITE_PIDS"
    echo "$VITE_PIDS" | xargs -r kill -9 2>/dev/null || true
    echo "✅ Killed orphaned Vite processes"
fi

# Find and kill orphaned TSX server processes
echo "Checking for orphaned server processes..."
TSX_PIDS=$(ps aux | grep -E "tsx.*src/server/index.ts" | grep -v grep | awk '{print $2}' || true)
if [ -n "$TSX_PIDS" ]; then
    echo "Found orphaned TSX processes: $TSX_PIDS"
    echo "$TSX_PIDS" | xargs -r kill -9 2>/dev/null || true
    echo "✅ Killed orphaned TSX processes"
fi

# Kill any processes on our standard ports
echo "Checking ports 3110 and 3120..."
for port in 3110 3120; do
    PIDS=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "Found process on port $port: $PIDS"
        echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
        echo "✅ Freed port $port"
    fi
done

# Clean up old PID files
echo "Cleaning up PID files..."
rm -f /tmp/capacinator-*.pid
rm -f /tmp/e2e-*.pid

echo "✅ Cleanup complete!"
echo ""
echo "Ports 3110 and 3120 should now be free."
echo "You can start the dev server with: npm run dev"