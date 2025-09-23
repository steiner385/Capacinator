#!/bin/bash

# Stop E2E Server Script
# This script stops the E2E server environment

set -e

echo "🛑 Stopping E2E Server Environment..."

# Kill processes using PID files
if [ -f /tmp/e2e-backend.pid ]; then
    E2E_SERVER_PID=$(cat /tmp/e2e-backend.pid)
    if kill -0 $E2E_SERVER_PID 2>/dev/null; then
        echo "🔴 Stopping E2E backend server (PID: $E2E_SERVER_PID)"
        kill $E2E_SERVER_PID || true
    fi
    rm -f /tmp/e2e-backend.pid
fi

if [ -f /tmp/e2e-frontend.pid ]; then
    E2E_FRONTEND_PID=$(cat /tmp/e2e-frontend.pid)
    if kill -0 $E2E_FRONTEND_PID 2>/dev/null; then
        echo "🔴 Stopping E2E frontend server (PID: $E2E_FRONTEND_PID)"
        kill $E2E_FRONTEND_PID || true
    fi
    rm -f /tmp/e2e-frontend.pid
fi

# Load E2E environment variables to get correct ports
export $(cat .env.e2e | grep -v '^#' | sed 's/#.*//' | grep -v '^$' | xargs)
E2E_PORT=${PORT:-3110}
E2E_CLIENT_PORT=${CLIENT_PORT:-3120}

# Force kill any remaining processes on E2E ports
echo "🔍 Force killing any remaining processes on E2E ports..."
lsof -ti:$E2E_PORT | xargs -r kill -9 2>/dev/null || true
lsof -ti:$E2E_CLIENT_PORT | xargs -r kill -9 2>/dev/null || true

# Cleanup E2E environment files
echo "🧹 Cleaning up E2E environment files..."
rm -f .env.local

# Cleanup E2E database if requested
if [ "$1" == "--cleanup-db" ]; then
    echo "🗑️  Cleaning up E2E database..."
    # Remove E2E database file and directory
    rm -rf .e2e-data
    echo "✅ E2E database cleaned up"
fi

echo "✅ E2E Server Environment stopped"