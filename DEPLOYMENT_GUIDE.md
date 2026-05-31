# ==============================================
# Deployment Guide - Video Conferencing App
# ==============================================

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- Server with at least 2GB RAM, 2 CPU cores

---

## Quick Deployment (5 Minutes)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/video-conferencing-app.git
cd video-conferencing-app
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Random 64-byte hex string
- `JWT_REFRESH_SECRET` - Different random 64-byte hex string
- `CORS_ORIGIN` - Your domain (https://yourdomain.com)

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3: Start Services

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Verify Deployment

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:80/health
```

---

## Production Deployment

### 1. Server Setup

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Install Docker Compose:**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSL Certificate (Let's Encrypt)

**Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

**Obtain certificate:**
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

**Auto-renewal:**
```bash
sudo crontab -e
# Add this line:
0 0 * * * certbot renew --quiet
```

### 3. Configure Nginx with SSL

```bash
# Copy SSL nginx config
cp client/nginx-ssl.conf client/nginx.conf

# Update domain name
sed -i 's/yourdomain.com/your-actual-domain.com/g' client/nginx.conf
```

### 4. Production Environment

```bash
# Use production environment file
cp .env.production .env

# Edit with production values
nano .env
```

**Important production settings:**
- Use strong passwords
- Use managed MongoDB (MongoDB Atlas)
- Use managed Redis (AWS ElastiCache, Redis Cloud)
- Set proper CORS origins
- Enable monitoring (Sentry)

### 5. Deploy

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 6. Verify Production

```bash
# Health check
curl https://yourdomain.com/api/health

# Check SSL
curl -I https://yourdomain.com

# Test WebSocket
wscat -c wss://yourdomain.com/socket.io/
```

---

## Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service-name]

# Execute command in container
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Maintenance

```bash
# Update images
docker-compose pull
docker-compose up -d

# Rebuild images
docker-compose build --no-cache
docker-compose up -d

# Clean up
docker system prune -a
docker volume prune
```

### Backup

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# Backup volumes
docker run --rm -v videoconf_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz /data

# Backup uploaded files
docker run --rm -v videoconf_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data
```

### Restore

```bash
# Restore MongoDB
docker-compose exec mongodb mongorestore /data/backup

# Restore volumes
docker run --rm -v videoconf_mongodb_data:/data -v $(pwd):/backup alpine tar xzf /backup/mongodb-backup.tar.gz -C /
```

---

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:5000/api/health

# Detailed health with services
curl http://localhost:5000/api/health | jq

# Readiness probe
curl http://localhost:5000/api/health/ready

# Liveness probe
curl http://localhost:5000/api/health/live
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Save logs to file
docker-compose logs > logs.txt
```

### Metrics

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Network inspection
docker network inspect videoconf-network
```

---

## Scaling

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Load balancer needed for multiple instances
# Use nginx upstream or external load balancer
```

### Vertical Scaling

Edit `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. MongoDB not connected - check MONGODB_URI
# 2. Port already in use - change PORT in .env
# 3. Missing environment variables - check .env file
```

### Frontend Not Accessible

```bash
# Check nginx logs
docker-compose logs frontend

# Test nginx config
docker-compose exec frontend nginx -t

# Common issues:
# 1. Port 80/443 already in use
# 2. SSL certificate path incorrect
# 3. Backend proxy not working - check backend URL
```

### Database Connection Issues

```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check connection from backend
docker-compose exec backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
```

### WebSocket Not Working

```bash
# Check Socket.io connection
# In browser console:
# socket.connected should be true

# Check nginx WebSocket proxy
docker-compose logs frontend | grep socket.io

# Verify upgrade headers
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/socket.io/
```

---

## Security Checklist

- [ ] Strong passwords for all services
- [ ] JWT secrets are random and secure
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured with specific origins
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] File upload size limits set
- [ ] Database access restricted
- [ ] Redis password protected
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured

---

## Performance Optimization

### Database Indexes

```javascript
// Ensure indexes are created
db.messages.createIndex({ roomId: 1, createdAt: -1 });
db.messages.createIndex({ content: "text" });
db.users.createIndex({ email: 1 }, { unique: true });
```

### Redis Caching

```javascript
// Cache frequently accessed data
// Session data, rate limiting, temporary data
```

### CDN Setup

```bash
# Use CDN for static assets
# CloudFlare, AWS CloudFront, etc.
```

### Nginx Optimization

```nginx
# Already configured in nginx-ssl.conf:
# - Gzip compression
# - Static asset caching
# - Connection keep-alive
# - Buffer optimization
```

---

## Backup Strategy

### Automated Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$DATE"

mkdir -p $BACKUP_DIR

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive > $BACKUP_DIR/mongodb.archive

# Backup uploads
docker run --rm -v videoconf_uploads_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads.tar.gz /data

# Backup logs
docker run --rm -v videoconf_logs_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/logs.tar.gz /data

# Keep only last 7 days
find /backups -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## Monitoring Setup

### Sentry (Error Tracking)

```bash
# Add to .env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Already integrated in backend
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

Monitor:
- https://yourdomain.com/api/health
- https://yourdomain.com

---

## CI/CD Setup

### GitHub Secrets

Add these secrets to your GitHub repository:

```
PRODUCTION_HOST - Server IP or hostname
PRODUCTION_USER - SSH username
PRODUCTION_SSH_KEY - Private SSH key
PRODUCTION_PORT - SSH port (default: 22)
SLACK_WEBHOOK - Slack webhook URL (optional)
```

### Deployment Workflow

1. Push to main branch
2. GitHub Actions runs tests
3. Builds Docker images
4. Pushes to registry
5. Deploys to production server
6. Runs health checks
7. Sends notification

---

## Support

### Documentation
- INTEGRATION_GUIDE.md
- COMPLETE_APP_SUMMARY.md
- QUICK_START.md

### Logs Location
- Backend: `/app/logs/`
- Nginx: `/var/log/nginx/`
- MongoDB: Docker logs

### Getting Help
1. Check logs: `docker-compose logs`
2. Check health: `curl /api/health`
3. Review documentation
4. Check GitHub issues

---

## Success!

Your video conferencing app is now deployed and running in production! 🎉

**Next steps:**
1. Configure monitoring
2. Set up automated backups
3. Test all features
4. Monitor performance
5. Scale as needed
