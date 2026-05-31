#!/bin/bash
# Video Conferencing App - Quick Start Script
# For Git Bash on Windows

set -e

echo "========================================"
echo "Video Conferencing App - Quick Start"
echo "========================================"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "[OK] Docker is running"
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Step 1: Install dependencies locally
echo "========================================"
echo "STEP 1: Installing Dependencies Locally"
echo "========================================"

echo "Installing client dependencies..."
cd client
if [ ! -d "node_modules" ]; then
    npm install --fetch-timeout=60000 --fetch-retries=5 || {
        echo "[ERROR] Client npm install failed!"
        echo "Try: npm install --registry=https://registry.npmmirror.com"
        exit 1
    }
else
    echo "[OK] Client node_modules exists"
fi

echo ""
echo "Installing server dependencies..."
cd ../server
if [ ! -d "node_modules" ]; then
    npm install --fetch-timeout=60000 --fetch-retries=5 || {
        echo "[ERROR] Server npm install failed!"
        exit 1
    }
else
    echo "[OK] Server node_modules exists"
fi

cd ..
echo ""

# Step 2: Clean and build
echo "========================================"
echo "STEP 2: Building Docker Images"
echo "========================================"

echo "Cleaning previous builds..."
docker-compose down -v 2>/dev/null || true
docker builder prune -f

echo ""
echo "Building images (this may take a few minutes)..."
docker-compose build --no-cache

echo ""

# Step 3: Start services
echo "========================================"
echo "STEP 3: Starting Services"
echo "========================================"

docker-compose up -d

echo ""
echo "Waiting for services to be healthy (30 seconds)..."
sleep 30

# Step 4: Verify
echo "========================================"
echo "STEP 4: Verification"
echo "========================================"

docker-compose ps

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Services are running at:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:5000"
echo "  MongoDB:   mongodb://localhost:27017"
echo "  Redis:     localhost:6379"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop all:      docker-compose down"
echo "  Restart:       docker-compose restart"
echo ""
