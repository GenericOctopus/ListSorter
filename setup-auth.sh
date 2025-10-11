#!/bin/bash

# ListSorter Authentication Setup Script
# This script helps set up the authentication server and CouchDB configuration

set -e

echo "=========================================="
echo "ListSorter Authentication Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CouchDB is running
echo "Checking CouchDB..."
if curl -s http://localhost:5984 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CouchDB is running${NC}"
else
    echo -e "${RED}✗ CouchDB is not running${NC}"
    echo "Please start CouchDB first:"
    echo "  Ubuntu/Debian: sudo systemctl start couchdb"
    echo "  macOS: brew services start couchdb"
    exit 1
fi

echo ""

# Get CouchDB admin credentials
echo "CouchDB Admin Credentials"
echo "-------------------------"
read -p "Enter CouchDB admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -sp "Enter CouchDB admin password: " ADMIN_PASSWORD
echo ""

# Verify admin credentials
echo "Verifying credentials..."
if curl -s -u "$ADMIN_USER:$ADMIN_PASSWORD" http://localhost:5984/_users > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Credentials verified${NC}"
else
    echo -e "${RED}✗ Invalid credentials${NC}"
    exit 1
fi

echo ""

# Enable CORS
echo "Configuring CORS..."
curl -s -X PUT "http://$ADMIN_USER:$ADMIN_PASSWORD@localhost:5984/_node/_local/_config/httpd/enable_cors" -d '"true"' > /dev/null
curl -s -X PUT "http://$ADMIN_USER:$ADMIN_PASSWORD@localhost:5984/_node/_local/_config/cors/origins" -d '"*"' > /dev/null
curl -s -X PUT "http://$ADMIN_USER:$ADMIN_PASSWORD@localhost:5984/_node/_local/_config/cors/credentials" -d '"true"' > /dev/null
curl -s -X PUT "http://$ADMIN_USER:$ADMIN_PASSWORD@localhost:5984/_node/_local/_config/cors/methods" -d '"GET, PUT, POST, HEAD, DELETE"' > /dev/null
curl -s -X PUT "http://$ADMIN_USER:$ADMIN_PASSWORD@localhost:5984/_node/_local/_config/cors/headers" -d '"accept, authorization, content-type, origin, referer"' > /dev/null
echo -e "${GREEN}✓ CORS configured${NC}"

echo ""

# Generate JWT secret
echo "Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✓ JWT secret generated${NC}"

echo ""

# Create .env file for auth server
echo "Creating auth server configuration..."
cd auth-server

if [ -f .env ]; then
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
    read -p "Overwrite? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "Skipping .env creation"
        cd ..
        exit 0
    fi
fi

cat > .env << EOF
# CouchDB Configuration
COUCHDB_URL=http://localhost:5984
COUCHDB_ADMIN_USER=$ADMIN_USER
COUCHDB_ADMIN_PASSWORD=$ADMIN_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4000
EOF

echo -e "${GREEN}✓ .env file created${NC}"

echo ""

# Install dependencies
echo "Installing auth server dependencies..."
if npm install > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

cd ..

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the auth server:"
echo "   cd auth-server && npm start"
echo ""
echo "2. In another terminal, start the Angular app:"
echo "   npm start"
echo ""
echo "3. Open http://localhost:4200 and register a new account"
echo ""
echo "For more information, see AUTH_SETUP.md"
echo ""
