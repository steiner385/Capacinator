#!/bin/bash

# Start the server in E2E mode with minimal setup
export NODE_ENV=e2e
export DATABASE_URL=:memory:
export PORT=3110
export CLIENT_PORT=3120

echo "Starting E2E server on port $PORT..."

# Use tsx to run the server directly
npx tsx src/server/index.ts