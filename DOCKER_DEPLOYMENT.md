# Docker Deployment Guide

This guide explains how to deploy ListSorter using Docker and Docker Compose.

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)

## Quick Start

### 1. Configure Environment

```bash
# Copy the example environment file
cp .env.docker .env

# Edit .env with your settings
nano .env
```

**Important:** Change these values in `.env`:
- `COUCHDB_ADMIN_PASSWORD` - Use a strong password
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `ALLOWED_ORIGINS` - Add your production domain

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Auth Server**: http://localhost:3001
- **CouchDB Admin**: http://localhost:5984/_utils

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │ Auth Server  │  │   CouchDB    │  │
│  │   (Nginx)    │  │  (Node.js)   │  │              │  │
│  │   Port 80    │  │  Port 3001   │  │  Port 5984   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                    Exposed to Host
```

## Services

### Frontend (Nginx + Angular)
- **Port**: 80
- **Image**: Built from Dockerfile
- **Features**: 
  - Production-optimized Angular build
  - Gzip compression
  - Static asset caching
  - Security headers

### Auth Server (Node.js)
- **Port**: 3001
- **Image**: Built from Dockerfile.auth-server
- **Features**:
  - User registration/login
  - JWT token management
  - CouchDB user creation

### CouchDB
- **Port**: 5984
- **Image**: couchdb:3.3
- **Features**:
  - Persistent data storage
  - Auto-configured CORS
  - Health checks

### CouchDB Config (One-time)
- **Purpose**: Configures CORS on startup
- **Runs**: Once, then exits
- **Required**: For browser access to CouchDB

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COUCHDB_ADMIN_USER` | admin | CouchDB admin username |
| `COUCHDB_ADMIN_PASSWORD` | changeme | CouchDB admin password |
| `JWT_SECRET` | change_this... | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | 7d | JWT token expiration |
| `ALLOWED_ORIGINS` | localhost | CORS allowed origins |

## Docker Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f auth-server
docker-compose logs -f couchdb
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart auth-server
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build frontend
```

### Execute Commands in Containers

```bash
# Access CouchDB shell
docker-compose exec couchdb bash

# Access auth server shell
docker-compose exec auth-server sh

# Access frontend shell
docker-compose exec frontend sh
```

### Check Service Health

```bash
# View service status
docker-compose ps

# Check health endpoints
curl http://localhost:3001/health
curl http://localhost:5984/_up
curl http://localhost/
```

## Data Persistence

Data is stored in Docker volumes:

- `couchdb-data` - Database files
- `couchdb-config` - CouchDB configuration

### Backup Data

```bash
# Backup CouchDB data
docker run --rm \
  -v listsorter_couchdb-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/couchdb-backup-$(date +%Y%m%d).tar.gz /data

# Restore CouchDB data
docker run --rm \
  -v listsorter_couchdb-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/couchdb-backup-YYYYMMDD.tar.gz -C /
```

## Production Deployment

### 1. Update Configuration

Edit `.env` for production:

```env
COUCHDB_ADMIN_PASSWORD=very_secure_password_here
JWT_SECRET=random_secret_generated_with_openssl
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Use HTTPS

Add a reverse proxy (nginx/Traefik) with SSL:

```yaml
# Example nginx reverse proxy config
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Update Angular Auth Service

Update `src/app/services/auth.service.ts`:

```typescript
private readonly AUTH_SERVER_URL = 'https://yourdomain.com/api';
```

Rebuild the frontend:

```bash
docker-compose up -d --build frontend
```

### 4. Security Checklist

- [ ] Change default passwords
- [ ] Generate strong JWT secret
- [ ] Use HTTPS for all connections
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable Docker security features
- [ ] Monitor logs for suspicious activity
- [ ] Keep Docker images updated

### 5. Monitoring

```bash
# Monitor resource usage
docker stats

# View container logs
docker-compose logs -f --tail=100

# Set up log rotation
# Add to docker-compose.yml:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Troubleshooting

### Services Won't Start

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

### CouchDB Connection Issues

```bash
# Check CouchDB health
curl http://localhost:5984/_up

# Verify CORS configuration
curl http://admin:password@localhost:5984/_node/_local/_config/cors

# Restart CouchDB
docker-compose restart couchdb
```

### Frontend Build Fails

```bash
# Check build logs
docker-compose logs frontend

# Rebuild with no cache
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Auth Server Issues

```bash
# Check environment variables
docker-compose exec auth-server env

# Check CouchDB connectivity from auth server
docker-compose exec auth-server wget -O- http://couchdb:5984

# View detailed logs
docker-compose logs -f auth-server
```

### Data Loss Prevention

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect listsorter_couchdb-data

# Create backup before updates
docker-compose exec couchdb couchdb-backup
```

## Scaling

### Horizontal Scaling

```bash
# Scale auth server
docker-compose up -d --scale auth-server=3

# Add load balancer (nginx/HAProxy)
```

### Vertical Scaling

Edit `docker-compose.yml`:

```yaml
services:
  couchdb:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Development vs Production

### Development

```bash
# Use docker-compose.override.yml for dev settings
# Mount source code for hot reload
volumes:
  - ./src:/app/src
```

### Production

```bash
# Use optimized builds
# No source code mounting
# Enable health checks
# Set resource limits
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [CouchDB Docker Image](https://hub.docker.com/_/couchdb)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: `.env` file
3. Check service health: `docker-compose ps`
4. Review this documentation
5. Check main project README.md
