# Docker Deployment - Quick Reference

## 🚀 Quick Start

```bash
# One command to deploy everything
./docker-start.sh
```

Access your app at: **http://localhost**

## 📦 What's Included

The Docker setup includes:

1. **CouchDB** (port 5984)
   - Persistent data storage
   - Auto-configured CORS
   - Health monitoring

2. **Auth Server** (port 3001)
   - User registration/login
   - JWT token management
   - CouchDB integration

3. **Angular Frontend** (port 80)
   - Production-optimized build
   - Nginx web server
   - Gzip compression
   - Static asset caching

## 🎯 Common Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Start and view logs
docker-compose up
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f auth-server
docker-compose logs -f couchdb
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes all data!)
docker-compose down -v
```

### Service Management
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart auth-server

# View service status
docker-compose ps

# View resource usage
docker stats
```

### Rebuild After Changes
```bash
# Rebuild frontend after code changes
docker-compose up -d --build frontend

# Rebuild auth server
docker-compose up -d --build auth-server
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# CouchDB
COUCHDB_ADMIN_USER=admin
COUCHDB_ADMIN_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_random_secret_key
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost,https://yourdomain.com
```

### Generate Secure JWT Secret
```bash
openssl rand -base64 32
```

## 🌐 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost | - |
| Auth Server | http://localhost:3001 | - |
| CouchDB Admin | http://localhost:5984/_utils | admin / (from .env) |
| CouchDB API | http://localhost:5984 | - |

## 🔍 Health Checks

```bash
# Check all services
curl http://localhost/           # Frontend
curl http://localhost:3001/health # Auth Server
curl http://localhost:5984/_up    # CouchDB

# Or use docker-compose
docker-compose ps
```

## 💾 Data Persistence

Data is stored in Docker volumes:
- `listsorter_couchdb-data` - Database files
- `listsorter_couchdb-config` - CouchDB configuration

### Backup
```bash
# Backup CouchDB data
docker run --rm \
  -v listsorter_couchdb-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/couchdb-$(date +%Y%m%d).tar.gz /data
```

### Restore
```bash
# Restore from backup
docker run --rm \
  -v listsorter_couchdb-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/couchdb-YYYYMMDD.tar.gz -C /
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check if ports are in use
lsof -i :80
lsof -i :3001
lsof -i :5984

# Remove and recreate
docker-compose down
docker-compose up -d
```

### CouchDB connection issues
```bash
# Check CouchDB health
curl http://localhost:5984/_up

# Restart CouchDB
docker-compose restart couchdb

# View CouchDB logs
docker-compose logs -f couchdb
```

### Frontend not loading
```bash
# Check nginx logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Auth server errors
```bash
# Check environment variables
docker-compose exec auth-server env

# Test CouchDB connection from auth server
docker-compose exec auth-server wget -O- http://couchdb:5984

# View logs
docker-compose logs -f auth-server
```

## 🔒 Production Deployment

### Security Checklist
- [ ] Change default passwords in `.env`
- [ ] Generate strong JWT secret
- [ ] Use HTTPS (add reverse proxy)
- [ ] Update ALLOWED_ORIGINS
- [ ] Set up firewall rules
- [ ] Enable Docker security features
- [ ] Set up monitoring
- [ ] Configure backups

### Add HTTPS with Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring

### View Resource Usage
```bash
docker stats
```

### Set Up Log Rotation
Add to `docker-compose.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 🔄 Updates

### Update Docker Images
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Update Application Code
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## 📚 Additional Resources

- [Full Docker Documentation](./DOCKER_DEPLOYMENT.md)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [CouchDB Docker Image](https://hub.docker.com/_/couchdb)
- [Nginx Configuration](https://nginx.org/en/docs/)

## 💡 Tips

1. **Development**: Use `docker-compose logs -f` to watch logs in real-time
2. **Production**: Set up automated backups with cron
3. **Scaling**: Use `docker-compose up -d --scale auth-server=3` to scale services
4. **Debugging**: Use `docker-compose exec <service> sh` to access container shell
5. **Performance**: Monitor with `docker stats` and adjust resource limits

## ❓ Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify configuration: `.env` file
3. Check service health: `docker-compose ps`
4. Review [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
5. Check Docker documentation

---

**Happy Deploying! 🎉**
