#!/bin/bash

# Run E2E tests with existing servers on ports 3111 (backend) and 3121 (frontend)

export E2E_USE_EXISTING_SERVERS=true
export E2E_EXISTING_BACKEND_URL=http://localhost:3111
export E2E_EXISTING_FRONTEND_URL=http://localhost:3121
export BASE_URL=http://localhost:3121
export API_URL=http://localhost:3111
export VITE_API_URL=http://localhost:3111

# Override the ports in the test config
export PORT=3111
export CLIENT_PORT=3121

echo "Running E2E tests with existing servers..."
echo "Backend: http://localhost:3111"
echo "Frontend: http://localhost:3121"

# Run the tests
npm run test:e2e -- --reporter=list,json --max-failures=10