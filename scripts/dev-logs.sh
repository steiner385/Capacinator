#!/bin/bash

echo "📄 Showing live development logs..."
echo "   Press Ctrl+C to stop viewing logs"
echo ""

if [ -f "/tmp/capacinator-logs/dev.log" ]; then
    tail -f /tmp/capacinator-logs/dev.log
else
    echo "⚠️  No log file found at /tmp/capacitor-logs/dev.log"
    echo "   Make sure the development servers are running with: npm run dev"
fi