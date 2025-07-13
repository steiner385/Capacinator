#!/bin/bash

echo "🛑 Stopping Capacinator development servers..."

# Check if PID file exists
if [ -f "/tmp/capacinator-dev.pid" ]; then
    DEV_PID=$(cat /tmp/capacinator-dev.pid)
    
    if ps -p $DEV_PID > /dev/null 2>&1; then
        echo "Stopping process $DEV_PID..."
        kill $DEV_PID
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if ps -p $DEV_PID > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 $DEV_PID
        fi
        
        echo "✅ Development servers stopped"
    else
        echo "⚠️  Process $DEV_PID not found (may have already stopped)"
    fi
    
    # Clean up PID file
    rm -f /tmp/capacinator-dev.pid
else
    echo "⚠️  No PID file found - trying to kill by process name..."
    pkill -f "concurrently.*dev:server.*dev:client" || true
    pkill -f "tsx.*src/server" || true
    pkill -f "vite" || true
    echo "✅ Attempted to stop all development processes"
fi