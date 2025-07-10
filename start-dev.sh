#!/bin/bash

# Kill any existing processes
pkill -f "tsx watch" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "concurrently" 2>/dev/null

# Wait a moment for cleanup
sleep 2

# Start the development servers
echo "Starting development servers..."
cd /home/tony/GitHub/Capacinator
npm run dev:web > /tmp/capacinator-dev-startup.log 2>&1 &

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 10

# Check if servers are running
if lsof -i :8082 > /dev/null 2>&1; then
    echo "✓ API server is running on port 8082"
else
    echo "✗ API server is not running on port 8082"
fi

if lsof -i :8090 > /dev/null 2>&1; then
    echo "✓ Client server is running on port 8090"
else
    echo "✗ Client server is not running on port 8090"
fi

echo "Development servers started. Check logs at /tmp/capacinator-dev-startup.log"