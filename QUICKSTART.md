# Quick Start Guide - Authentication & CouchDB

Get up and running with authentication and CouchDB sync in 5 minutes!

## Prerequisites

- CouchDB installed and running
- Node.js and npm installed
- CouchDB admin credentials

## Automated Setup (Recommended)

Run the setup script:

```bash
./setup-auth.sh
```

This will:
- ✓ Verify CouchDB is running
- ✓ Configure CORS
- ✓ Generate JWT secret
- ✓ Create auth server `.env` file
- ✓ Install dependencies

## Manual Setup

If you prefer manual setup, follow these steps:

### 1. Configure CouchDB CORS

```bash
# Replace admin:password with your credentials
COUCH_USER="admin"
COUCH_PASS="your_password"
COUCH_URL="http://$COUCH_USER:$COUCH_PASS@localhost:5984"

curl -X PUT "$COUCH_URL/_node/_local/_config/httpd/enable_cors" -d '"true"'
curl -X PUT "$COUCH_URL/_node/_local/_config/cors/origins" -d '"*"'
curl -X PUT "$COUCH_URL/_node/_local/_config/cors/credentials" -d '"true"'
curl -X PUT "$COUCH_URL/_node/_local/_config/cors/methods" -d '"GET, PUT, POST, HEAD, DELETE"'
curl -X PUT "$COUCH_URL/_node/_local/_config/cors/headers" -d '"accept, authorization, content-type, origin, referer"'
```

### 2. Set Up Auth Server

```bash
cd auth-server
cp .env.example .env
# Edit .env with your CouchDB credentials
npm install
```

### 3. Start Services

Terminal 1 - Auth Server:
```bash
cd auth-server
npm start
```

Terminal 2 - Angular App:
```bash
npm start
```

### 4. Register & Login

Open http://localhost:4200 and create an account!

## What You Get

✓ **User Authentication** - Secure login/register with JWT tokens  
✓ **Per-User Databases** - Each user gets their own isolated CouchDB database  
✓ **Automatic Sync** - Local PouchDB syncs with remote CouchDB  
✓ **Offline Support** - App works offline, syncs when online  
✓ **Route Guards** - Protected routes require authentication  

## Architecture

```
┌─────────────────┐
│  Angular App    │
│  (Port 4200)    │
│                 │
│  - PouchDB      │◄─────┐
│  - Auth Service │      │
│  - Route Guards │      │
└────────┬────────┘      │
         │               │
         │ HTTP          │ Sync
         │               │
         ▼               │
┌─────────────────┐      │
│  Auth Server    │      │
│  (Port 3001)    │      │
│                 │      │
│  - Register     │      │
│  - Login        │      │
│  - JWT Tokens   │      │
└────────┬────────┘      │
         │               │
         │ Admin API     │
         │               │
         ▼               │
┌─────────────────┐      │
│    CouchDB      │      │
│  (Port 5984)    │      │
│                 │      │
│  - _users DB    │      │
│  - User DBs     │◄─────┘
└─────────────────┘
```

## Testing the Setup

### 1. Check CouchDB
```bash
curl http://localhost:5984
# Should return: {"couchdb":"Welcome",...}
```

### 2. Check Auth Server
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

### 3. Register a User
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

### 4. Check User Database Created
Visit: http://localhost:5984/_utils

You should see a database named `userdb-<hex>` for your user.

## Common Issues

### Port Already in Use

**Auth Server (3001)**:
```bash
lsof -i :3001
kill -9 <PID>
```

**Angular (4200)**:
```bash
lsof -i :4200
kill -9 <PID>
```

### CouchDB Not Running

**Ubuntu/Debian**:
```bash
sudo systemctl start couchdb
sudo systemctl status couchdb
```

**macOS**:
```bash
brew services start couchdb
brew services list
```

### CORS Errors

Re-run CORS configuration (see Manual Setup, step 1) or run:
```bash
./setup-auth.sh
```

### Sync Not Working

1. Check browser console for errors
2. Verify auth server is running
3. Check CouchDB is accessible
4. Try force sync in browser console:
   ```javascript
   // In browser console
   const dbService = document.querySelector('app-root').__ngContext__[8].get('DatabaseService');
   dbService.forceSyncNow();
   ```

## Next Steps

- Read [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed documentation
- Check [auth-server/README.md](./auth-server/README.md) for API reference
- Review security considerations for production deployment

## Support

For issues or questions:
1. Check the troubleshooting section in AUTH_SETUP.md
2. Review CouchDB logs: `journalctl -u couchdb -f` (Linux)
3. Check auth server logs in the terminal

Happy sorting! 🎉
