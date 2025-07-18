#!/bin/bash

echo "📄 Showing live E2E logs..."
echo "   Press Ctrl+C to stop viewing logs"
echo ""

if [ -f "/tmp/capacinator-logs/e2e-backend.log" ]; then
    echo "🖥️  Backend logs:"
    tail -f /tmp/capacinator-logs/e2e-backend.log &
    BACKEND_TAIL_PID=$!
fi

if [ -f "/tmp/capacinator-logs/e2e-frontend.log" ]; then
    echo "🌐 Frontend logs:"
    tail -f /tmp/capacinator-logs/e2e-frontend.log &
    FRONTEND_TAIL_PID=$!
fi

if [ -z "$BACKEND_TAIL_PID" ] && [ -z "$FRONTEND_TAIL_PID" ]; then
    echo "⚠️  No E2E log files found"
    echo "   Make sure the E2E servers are running with: npm run e2e:start"
else
    # Wait for Ctrl+C
    trap "kill $BACKEND_TAIL_PID $FRONTEND_TAIL_PID 2>/dev/null || true; exit 0" SIGINT
    wait
fi