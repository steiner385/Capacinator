#!/bin/bash

echo "🛑 Stopping Capacinator production server..."

# Check if PID file exists
if [ -f "/tmp/capacinator-prod.pid" ]; then
    PROD_PID=$(cat /tmp/capacinator-prod.pid)
    
    if ps -p $PROD_PID > /dev/null 2>&1; then
        echo "Stopping process $PROD_PID..."
        kill $PROD_PID
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        if ps -p $PROD_PID > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 $PROD_PID
        fi
        
        echo "✅ Production server stopped"
    else
        echo "⚠️  Process $PROD_PID not found (may have already stopped)"
    fi
    
    # Clean up PID file
    rm -f /tmp/capacinator-prod.pid
else
    echo "⚠️  No PID file found - trying to kill by process name..."
    lsof -ti:3110 | xargs -r kill -9 2>/dev/null || true
    pkill -f "tsx.*src/server" || true
    echo "✅ Attempted to stop production server"
fi