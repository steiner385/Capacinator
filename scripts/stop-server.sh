#!/bin/bash

echo "🛑 Stopping Capacinator server..."

# Check if PID file exists
if [ -f "/tmp/capacinator-server.pid" ]; then
    SERVER_PID=$(cat /tmp/capacinator-server.pid)
    
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "Stopping process $SERVER_PID..."
        kill $SERVER_PID
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 $SERVER_PID
        fi
        
        echo "✅ Server stopped"
    else
        echo "⚠️  Process $SERVER_PID not found (may have already stopped)"
    fi
    
    # Clean up PID file
    rm -f /tmp/capacinator-server.pid
else
    echo "⚠️  No PID file found - trying to kill by process name..."
    lsof -ti:3110 | xargs -r kill -9 2>/dev/null || true
    pkill -f "node.*dist/server" || true
    echo "✅ Attempted to stop server"
fi