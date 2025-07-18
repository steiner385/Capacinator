#!/bin/bash

echo "📄 Showing live server logs..."
echo "   Press Ctrl+C to stop viewing logs"
echo ""

if [ -f "/tmp/capacinator-logs/server.log" ]; then
    tail -f /tmp/capacinator-logs/server.log
else
    echo "⚠️  No log file found at /tmp/capacinator-logs/server.log"
    echo "   Make sure the server is running with: npm run server:start"
fi