@echo off
echo ========================================
echo Starting Video Conferencing App Locally
echo ========================================
echo.

REM Start MongoDB and Redis
echo Starting MongoDB and Redis...
start "MongoDB & Redis" cmd /k "cd /d F:\video-conferencing-app && docker-compose up mongodb redis"

REM Wait for databases to start
timeout /t 10 /nobreak

REM Start Backend
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d F:\video-conferencing-app\server && npm start"

REM Wait for backend to start
timeout /t 5 /nobreak

REM Start Frontend
echo Starting Frontend...
start "Frontend" cmd /k "cd /d F:\video-conferencing-app\client && npm start"

echo.
echo ========================================
echo All services starting...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo MongoDB:  mongodb://localhost:27017
echo Redis:    localhost:6379
echo.
echo Press any key to exit this window...
pause
