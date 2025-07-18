#!/bin/bash

echo "🛑 Stopping Capacinator production frontend..."

# Check if PID file exists
if [ -f "/tmp/capacinator-frontend.pid" ]; then
    FRONTEND_PID=$(cat /tmp/capacinator-frontend.pid)
    
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "Stopping process $FRONTEND_PID..."
        kill $FRONTEND_PID
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 $FRONTEND_PID
        fi
        
        echo "✅ Production frontend stopped"
    else
        echo "⚠️  Process $FRONTEND_PID not found (may have already stopped)"
    fi
    
    # Clean up PID file
    rm -f /tmp/capacinator-frontend.pid
else
    echo "⚠️  No PID file found - trying to kill by process name..."
    lsof -ti:5174 | xargs -r kill -9 2>/dev/null || true
    pkill -f "vite.*preview" || true
    echo "✅ Attempted to stop production frontend"
fi