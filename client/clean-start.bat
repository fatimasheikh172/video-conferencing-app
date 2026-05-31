@echo off
echo ========================================
echo   Video Conferencing App - Clean Start
echo ========================================
echo.

echo [1/4] Stopping any running servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Clearing cache...
cd /d "%~dp0"
if exist .cache rmdir /s /q .cache
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [3/4] Starting development server...
echo.
echo IMPORTANT: After server starts, do the following in Chrome:
echo   1. Press Ctrl+Shift+Delete
echo   2. Select "Cached images and files"
echo   3. Select "All time"
echo   4. Click "Clear data"
echo   5. Close and reopen browser
echo   6. Go to http://localhost:3000
echo.
echo Starting server in 3 seconds...
timeout /t 3 /nobreak >nul

set NODE_OPTIONS=--no-warnings
npm start
