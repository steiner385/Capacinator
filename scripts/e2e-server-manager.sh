#!/bin/bash

# E2E Server Manager - Robust server management for E2E tests
# This script handles all server lifecycle operations with proper error handling

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/tmp/capacinator-logs"
PID_DIR="/tmp"

# Create log directory
mkdir -p "$LOG_DIR"

# Load environment variables from .env.e2e
load_env() {
    if [ -f "$PROJECT_ROOT/.env.e2e" ]; then
        export $(cat "$PROJECT_ROOT/.env.e2e" | grep -v '^#' | sed 's/#.*//' | grep -v '^$' | xargs)
    else
        echo -e "${RED}❌ .env.e2e file not found!${NC}"
        exit 1
    fi
}

# Get port numbers from environment
get_ports() {
    E2E_PORT=${PORT:-3110}
    E2E_CLIENT_PORT=${CLIENT_PORT:-3120}
    echo -e "${BLUE}ℹ️  Using ports: Backend=$E2E_PORT, Frontend=$E2E_CLIENT_PORT${NC}"
}

# Check if a port is in use
is_port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}⚠️  Killing process(es) on port $port: $pids${NC}"
        echo $pids | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Wait for URL to be accessible
wait_for_url() {
    local url=$1
    local timeout=${2:-30}
    local counter=0
    
    echo -e "${BLUE}⏳ Waiting for $url to be ready...${NC}"
    while [ $counter -lt $timeout ]; do
        if curl -s --fail "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $url is ready!${NC}"
            return 0
        fi
        sleep 1
        counter=$((counter + 1))
        echo -ne "\r${BLUE}⏳ Waiting... ${counter}/${timeout}s${NC}"
    done
    echo -e "\n${RED}❌ $url failed to respond within ${timeout} seconds${NC}"
    return 1
}

# Check server health
check_health() {
    local backend_url="http://localhost:$E2E_PORT/api/health"
    local frontend_url="http://localhost:$E2E_CLIENT_PORT"
    
    echo -e "${BLUE}🏥 Checking server health...${NC}"
    
    if curl -s --fail "$backend_url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${RED}❌ Backend is not responding${NC}"
        return 1
    fi
    
    if curl -s --fail "$frontend_url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
    else
        echo -e "${RED}❌ Frontend is not responding${NC}"
        return 1
    fi
    
    return 0
}

# Start servers
start_servers() {
    echo -e "${BLUE}🚀 Starting E2E servers...${NC}"
    
    # Check if servers are already running
    if check_health 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Servers are already running!${NC}"
        echo -e "${YELLOW}   Use '$0 stop' to stop them first${NC}"
        return 0
    fi
    
    # Kill any existing processes
    kill_port $E2E_PORT
    kill_port $E2E_CLIENT_PORT
    
    # Clean up any existing E2E database
    echo -e "${BLUE}🧹 Cleaning up previous E2E database...${NC}"
    rm -rf "$PROJECT_ROOT/.e2e-data"
    
    # Start backend server (database will be initialized automatically)
    echo -e "${BLUE}🖥️  Starting backend server on port $E2E_PORT...${NC}"
    NODE_ENV=e2e PORT=$E2E_PORT npx tsx src/server/index.ts \
        > "$LOG_DIR/e2e-backend.log" 2>&1 &
    E2E_SERVER_PID=$!
    echo $E2E_SERVER_PID > "$PID_DIR/e2e-backend.pid"
    
    # Wait for backend
    if ! wait_for_url "http://localhost:$E2E_PORT/api/health" 30; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        kill $E2E_SERVER_PID 2>/dev/null || true
        tail -20 "$LOG_DIR/e2e-backend.log"
        return 1
    fi
    
    # Create environment file for frontend
    cat > "$PROJECT_ROOT/.env.local" << EOF
NODE_ENV=e2e
VITE_API_URL=http://localhost:$E2E_PORT
EOF
    
    # Start frontend server
    echo -e "${BLUE}🌐 Starting frontend server on port $E2E_CLIENT_PORT...${NC}"
    cd "$PROJECT_ROOT"
    NODE_ENV=e2e VITE_API_URL=http://localhost:$E2E_PORT VITE_PORT=$E2E_CLIENT_PORT \
        npx vite --config client-vite.config.ts --port $E2E_CLIENT_PORT --host \
        > "$LOG_DIR/e2e-frontend.log" 2>&1 &
    E2E_FRONTEND_PID=$!
    echo $E2E_FRONTEND_PID > "$PID_DIR/e2e-frontend.pid"
    
    # Wait for frontend
    if ! wait_for_url "http://localhost:$E2E_CLIENT_PORT" 30; then
        echo -e "${RED}❌ Frontend failed to start${NC}"
        kill $E2E_SERVER_PID 2>/dev/null || true
        kill $E2E_FRONTEND_PID 2>/dev/null || true
        tail -20 "$LOG_DIR/e2e-frontend.log"
        return 1
    fi
    
    # Final health check
    if check_health; then
        echo -e "${GREEN}✅ E2E servers started successfully!${NC}"
        echo -e "${BLUE}📝 Backend PID: $E2E_SERVER_PID${NC}"
        echo -e "${BLUE}📝 Frontend PID: $E2E_FRONTEND_PID${NC}"
        echo -e "${BLUE}📝 Logs: $LOG_DIR${NC}"
        return 0
    else
        echo -e "${RED}❌ Server health check failed${NC}"
        return 1
    fi
}

# Stop servers
stop_servers() {
    echo -e "${BLUE}🛑 Stopping E2E servers...${NC}"
    
    # Read PIDs from files
    if [ -f "$PID_DIR/e2e-backend.pid" ]; then
        BACKEND_PID=$(cat "$PID_DIR/e2e-backend.pid")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Stopping backend (PID: $BACKEND_PID)${NC}"
            kill $BACKEND_PID 2>/dev/null || true
        fi
        rm -f "$PID_DIR/e2e-backend.pid"
    fi
    
    if [ -f "$PID_DIR/e2e-frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PID_DIR/e2e-frontend.pid")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Stopping frontend (PID: $FRONTEND_PID)${NC}"
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        rm -f "$PID_DIR/e2e-frontend.pid"
    fi
    
    # Force kill any remaining processes
    kill_port $E2E_PORT
    kill_port $E2E_CLIENT_PORT
    
    # Clean up env file
    rm -f "$PROJECT_ROOT/.env.local"
    
    # Clean up E2E database if requested
    if [ "$1" == "--cleanup-db" ]; then
        echo -e "${BLUE}🗑️  Cleaning up E2E database...${NC}"
        rm -rf "$PROJECT_ROOT/.e2e-data"
    fi
    
    echo -e "${GREEN}✅ E2E servers stopped${NC}"
}

# Show logs
show_logs() {
    echo -e "${BLUE}📄 E2E Server Logs${NC}"
    echo -e "${BLUE}==================${NC}"
    
    if [ -f "$LOG_DIR/e2e-backend.log" ]; then
        echo -e "${BLUE}Backend logs:${NC}"
        tail -f "$LOG_DIR/e2e-backend.log" &
        BACKEND_TAIL_PID=$!
    fi
    
    if [ -f "$LOG_DIR/e2e-frontend.log" ]; then
        echo -e "${BLUE}Frontend logs:${NC}"
        tail -f "$LOG_DIR/e2e-frontend.log" &
        FRONTEND_TAIL_PID=$!
    fi
    
    # Wait for Ctrl+C
    trap "kill $BACKEND_TAIL_PID $FRONTEND_TAIL_PID 2>/dev/null; exit" INT
    wait
}

# Main script
main() {
    load_env
    get_ports
    
    case "${1:-}" in
        start)
            start_servers
            ;;
        stop)
            stop_servers "$2"
            ;;
        restart)
            stop_servers
            sleep 2
            start_servers
            ;;
        status)
            check_health
            ;;
        logs)
            show_logs
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs}"
            echo "  start   - Start E2E servers"
            echo "  stop    - Stop E2E servers (add --cleanup-db to remove database)"
            echo "  restart - Restart E2E servers"
            echo "  status  - Check server health"
            echo "  logs    - Show server logs"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"