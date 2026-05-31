# Video Conferencing App - Docker Setup Guide
# Complete step-by-step instructions for Pakistan network conditions

## STEP 1: Update Docker Desktop Configuration

1. Open Docker Desktop
2. Go to Settings → Docker Engine
3. Replace the entire JSON with the content from `docker-daemon-config.json`:
   ```json
   {
     "dns": ["8.8.8.8", "8.8.4.4"],
     "builder": {
       "gc": {
         "enabled": true,
         "defaultKeepStorage": "20GB"
       }
     }
   }
   ```
4. Click "Apply & Restart"
5. Wait for Docker to restart completely

## STEP 2: Pre-install Node Modules Locally (CRITICAL)

### For Client (Frontend):
```bash
cd F:\video-conferencing-app\client
npm install
```

**Important:** If npm install fails due to network issues, try:
```bash
# Option A: Use a different registry
npm install --registry=https://registry.npmmirror.com

# Option B: Increase timeout
npm install --fetch-timeout=60000 --fetch-retries=5

# Option C: Install in smaller batches (if still failing)
npm install --prefer-offline --no-audit --no-fund
```

### For Server (Backend):
```bash
cd F:\video-conferencing-app\server
npm install
```

**Verification:** Check that both directories have `node_modules` folders:
```bash
dir F:\video-conferencing-app\client\node_modules
dir F:\video-conferencing-app\server\node_modules
```

## STEP 3: Clean Previous Docker Build Cache (Optional but Recommended)

```bash
cd F:\video-conferencing-app

# Remove old containers
docker-compose down -v

# Clean build cache
docker builder prune -a -f

# Remove old images (optional)
docker rmi videoconf-frontend videoconf-backend 2>nul
```

## STEP 4: Build Docker Images

```bash
cd F:\video-conferencing-app

# Build all services (this will use local node_modules, no network needed)
docker-compose build --no-cache

# Or build individually to see progress:
docker-compose build backend
docker-compose build frontend
```

**Expected Output:**
- Backend should build successfully (already working)
- Frontend should build WITHOUT running npm install (uses copied node_modules)
- No mirror.gcr.io errors
- No ECONNRESET errors

## STEP 5: Start All Services

```bash
cd F:\video-conferencing-app

# Start all containers in detached mode
docker-compose up -d

# Or start with logs visible (recommended first time)
docker-compose up
```

**Press Ctrl+C to stop when running in foreground mode**

## STEP 6: Verify All Containers Are Running

```bash
# Check container status
docker-compose ps

# Expected output: All 4 services should show "Up" status:
# - videoconf-mongodb    (port 27017)
# - videoconf-redis      (port 6379)
# - videoconf-backend    (port 5000)
# - videoconf-frontend   (port 3000 → 80)

# Check logs for any errors
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
docker-compose logs redis

# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## STEP 7: Test the Application

### Backend API:
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Or open in browser:
# http://localhost:5000/api/health
```

### Frontend:
```bash
# Open in browser:
# http://localhost:3000
```

### MongoDB:
```bash
# Connect using MongoDB Compass or CLI:
mongodb://admin:password@localhost:27017
```

### Redis:
```bash
# Test Redis connection
docker exec -it videoconf-redis redis-cli -a redispassword ping
# Should return: PONG
```

## TROUBLESHOOTING

### If Frontend Build Still Fails:

1. **Verify node_modules exists locally:**
   ```bash
   dir F:\video-conferencing-app\client\node_modules
   ```

2. **Check .dockerignore is NOT ignoring node_modules:**
   ```bash
   type F:\video-conferencing-app\client\.dockerignore | findstr node_modules
   ```
   Should NOT show "node_modules/" uncommented

3. **Rebuild with verbose output:**
   ```bash
   docker-compose build --no-cache --progress=plain frontend
   ```

### If Backend Fails:

1. **Check MongoDB is healthy:**
   ```bash
   docker-compose logs mongodb
   ```

2. **Check Redis is healthy:**
   ```bash
   docker-compose logs redis
   ```

3. **Verify environment variables in .env file**

### If Port Conflicts:

```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :27017
netstat -ano | findstr :6379

# Stop conflicting services or change ports in docker-compose.yml
```

## USEFUL COMMANDS

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Restart a specific service
docker-compose restart backend

# View real-time logs
docker-compose logs -f

# Execute command in container
docker exec -it videoconf-backend sh

# Rebuild and restart specific service
docker-compose up -d --build frontend

# Check resource usage
docker stats
```

## NETWORK-FREE BUILD VERIFICATION

The key advantage of this setup:
- ✓ npm install runs LOCALLY (where you can retry/use mirrors)
- ✓ Docker build uses COPIED node_modules (no network needed)
- ✓ Only base images (node:20-alpine, nginx:alpine) need download (one-time)
- ✓ No registry mirrors that fail in Pakistan
- ✓ Build works completely offline after initial setup

## SUCCESS CRITERIA

✓ All 4 containers running (docker-compose ps shows "Up")
✓ Backend responds at http://localhost:5000/api/health
✓ Frontend loads at http://localhost:3000
✓ No ECONNRESET errors during build
✓ No mirror.gcr.io DNS errors
✓ Build completes in under 5 minutes
