#!/bin/bash

# Development script to run both auth server and Angular app
# This script starts both servers in the background and provides easy management

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID files
AUTH_PID_FILE=".auth-server.pid"
ANGULAR_PID_FILE=".angular.pid"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    
    if [ -f "$AUTH_PID_FILE" ]; then
        AUTH_PID=$(cat "$AUTH_PID_FILE")
        if ps -p "$AUTH_PID" > /dev/null 2>&1; then
            kill "$AUTH_PID" 2>/dev/null || true
            echo -e "${GREEN}✓ Auth server stopped${NC}"
        fi
        rm "$AUTH_PID_FILE"
    fi
    
    if [ -f "$ANGULAR_PID_FILE" ]; then
        ANGULAR_PID=$(cat "$ANGULAR_PID_FILE")
        if ps -p "$ANGULAR_PID" > /dev/null 2>&1; then
            kill "$ANGULAR_PID" 2>/dev/null || true
            echo -e "${GREEN}✓ Angular server stopped${NC}"
        fi
        rm "$ANGULAR_PID_FILE"
    fi
    
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "=========================================="
echo "ListSorter Development Environment"
echo "=========================================="
echo ""

# Check if CouchDB is running
echo "Checking prerequisites..."
if ! curl -s http://localhost:5984 > /dev/null 2>&1; then
    echo -e "${RED}✗ CouchDB is not running${NC}"
    echo "Please start CouchDB first:"
    echo "  Ubuntu/Debian: sudo systemctl start couchdb"
    echo "  macOS: brew services start couchdb"
    exit 1
fi
echo -e "${GREEN}✓ CouchDB is running${NC}"

# Check if auth server is configured
if [ ! -f "auth-server/.env" ]; then
    echo -e "${RED}✗ Auth server not configured${NC}"
    echo "Please run: ./setup-auth.sh"
    exit 1
fi
echo -e "${GREEN}✓ Auth server configured${NC}"

echo ""

# Start auth server
echo -e "${BLUE}Starting auth server...${NC}"
cd auth-server
npm start > ../auth-server.log 2>&1 &
AUTH_PID=$!
echo $AUTH_PID > "../$AUTH_PID_FILE"
cd ..

# Wait for auth server to be ready
echo "Waiting for auth server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Auth server running on http://localhost:3001${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Auth server failed to start${NC}"
        echo "Check auth-server.log for details"
        cleanup
    fi
    sleep 1
done

echo ""

# Start Angular app
echo -e "${BLUE}Starting Angular app...${NC}"
npm start > angular.log 2>&1 &
ANGULAR_PID=$!
echo $ANGULAR_PID > "$ANGULAR_PID_FILE"

# Wait for Angular to be ready
echo "Waiting for Angular to start..."
for i in {1..60}; do
    if curl -s http://localhost:4200 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Angular app running on http://localhost:4200${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Angular failed to start${NC}"
        echo "Check angular.log for details"
        cleanup
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo -e "${GREEN}Development environment ready!${NC}"
echo "=========================================="
echo ""
echo "Services:"
echo "  • CouchDB:     http://localhost:5984"
echo "  • Auth Server: http://localhost:3001"
echo "  • Angular App: http://localhost:4200"
echo ""
echo "Logs:"
echo "  • Auth Server: tail -f auth-server.log"
echo "  • Angular:     tail -f angular.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for user to press Ctrl+C
wait
