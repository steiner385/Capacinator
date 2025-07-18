#!/bin/bash

echo "📄 Showing live production frontend logs..."
echo "   Press Ctrl+C to stop viewing logs"
echo ""

if [ -f "/tmp/capacinator-logs/prod-frontend.log" ]; then
    tail -f /tmp/capacinator-logs/prod-frontend.log
else
    echo "⚠️  No log file found at /tmp/capacinator-logs/prod-frontend.log"
    echo "   Make sure the production frontend is running with: npm run prod:frontend:start"
fi