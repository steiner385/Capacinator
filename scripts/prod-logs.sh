#!/bin/bash

echo "📄 Showing live production logs..."
echo "   Press Ctrl+C to stop viewing logs"
echo ""

if [ -f "/tmp/capacinator-logs/prod.log" ]; then
    tail -f /tmp/capacinator-logs/prod.log
else
    echo "⚠️  No log file found at /tmp/capacinator-logs/prod.log"
    echo "   Make sure the production server is running with: npm run prod:start"
fi