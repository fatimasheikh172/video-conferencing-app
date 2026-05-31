@echo off
echo Starting Video Conferencing App services...
echo.
echo This will start MongoDB, Redis, Backend, and Frontend
echo.
docker-compose up -d mongodb redis
echo.
echo Waiting for databases to be ready...
timeout /t 10 /nobreak
echo.
echo Services started! MongoDB is available at localhost:27017
echo.
docker-compose ps
