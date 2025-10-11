#!/bin/bash

# Docker Quick Start Script for ListSorter

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "ListSorter Docker Deployment"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env file from template..."
    
    cp .env.docker .env
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change_this_secret_$(date +%s)")
    
    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    fi
    
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Please edit .env and set a secure COUCHDB_ADMIN_PASSWORD${NC}"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit and edit .env first..."
fi

echo ""
echo "Starting services..."
echo ""

# Build and start services
docker-compose up -d --build

echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check service health
echo ""
echo "Checking service health..."

# Check CouchDB
if curl -s http://localhost:5984/_up > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CouchDB is running${NC}"
else
    echo -e "${YELLOW}⚠ CouchDB is starting...${NC}"
fi

# Check Auth Server
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Auth Server is running${NC}"
else
    echo -e "${YELLOW}⚠ Auth Server is starting...${NC}"
fi

# Check Frontend
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend is starting...${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Services are available at:"
echo "  • Frontend:    http://localhost"
echo "  • Auth Server: http://localhost:3001"
echo "  • CouchDB:     http://localhost:5984/_utils"
echo ""
echo "Useful commands:"
echo "  • View logs:        docker-compose logs -f"
echo "  • Stop services:    docker-compose down"
echo "  • Restart:          docker-compose restart"
echo "  • View status:      docker-compose ps"
echo ""
echo "For more information, see DOCKER_DEPLOYMENT.md"
echo ""
