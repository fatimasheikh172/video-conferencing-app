@echo off
REM Video Conferencing App - Automated Docker Setup Script
REM For Windows 10 with network connectivity issues in Pakistan

echo ========================================
echo Video Conferencing App - Docker Setup
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Step 1: Install client dependencies locally
echo ========================================
echo STEP 1: Installing Client Dependencies
echo ========================================
cd /d F:\video-conferencing-app\client

if not exist "node_modules" (
    echo Installing client node_modules...
    npm install --fetch-timeout=60000 --fetch-retries=5
    if errorlevel 1 (
        echo [ERROR] Client npm install failed!
        echo Try manually: npm install --registry=https://registry.npmmirror.com
        pause
        exit /b 1
    )
) else (
    echo [OK] Client node_modules already exists
)
echo.

REM Step 2: Install server dependencies locally
echo ========================================
echo STEP 2: Installing Server Dependencies
echo ========================================
cd /d F:\video-conferencing-app\server

if not exist "node_modules" (
    echo Installing server node_modules...
    npm install --fetch-timeout=60000 --fetch-retries=5
    if errorlevel 1 (
        echo [ERROR] Server npm install failed!
        pause
        exit /b 1
    )
) else (
    echo [OK] Server node_modules already exists
)
echo.

REM Step 3: Clean previous Docker builds
echo ========================================
echo STEP 3: Cleaning Previous Docker Builds
echo ========================================
cd /d F:\video-conferencing-app

echo Stopping existing containers...
docker-compose down -v 2>nul

echo Cleaning build cache...
docker builder prune -f

echo Removing old images...
docker rmi videoconf-frontend videoconf-backend 2>nul

echo [OK] Cleanup complete
echo.

REM Step 4: Build Docker images
echo ========================================
echo STEP 4: Building Docker Images
echo ========================================
cd /d F:\video-conferencing-app

echo Building backend...
docker-compose build backend
if errorlevel 1 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)
echo [OK] Backend built successfully
echo.

echo Building frontend...
docker-compose build frontend
if errorlevel 1 (
    echo [ERROR] Frontend build failed!
    echo Check that client/node_modules exists and .dockerignore is correct
    pause
    exit /b 1
)
echo [OK] Frontend built successfully
echo.

REM Step 5: Start all services
echo ========================================
echo STEP 5: Starting All Services
echo ========================================
cd /d F:\video-conferencing-app

echo Starting containers...
docker-compose up -d

if errorlevel 1 (
    echo [ERROR] Failed to start containers!
    pause
    exit /b 1
)
echo.

REM Wait for services to be healthy
echo Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak >nul

REM Step 6: Verify all containers
echo ========================================
echo STEP 6: Verifying Containers
echo ========================================

docker-compose ps
echo.

echo ========================================
echo Testing Services
echo ========================================

echo Testing Backend Health...
curl -s http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend health check failed - may still be starting
) else (
    echo [OK] Backend is responding
)
echo.

echo Testing Frontend...
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Frontend health check failed - may still be starting
) else (
    echo [OK] Frontend is responding
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Services are running at:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:5000
echo   MongoDB:   mongodb://localhost:27017
echo   Redis:     localhost:6379
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.
pause
