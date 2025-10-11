# Authentication & CouchDB Setup Guide

This guide will help you set up authentication and CouchDB synchronization for the ListSorter application.

## Architecture Overview

The authentication system consists of three main components:

1. **CouchDB** - Stores user accounts and per-user databases
2. **Auth Server** (Node.js/Express) - Handles registration/login with admin privileges
3. **Angular App** - Frontend with authentication UI and PouchDB sync

### Why an Auth Server?

CouchDB doesn't allow non-admin users to create accounts in the `_users` database. The auth server uses admin credentials to:
- Create user accounts in CouchDB's `_users` database
- Create per-user databases with proper permissions
- Issue JWT tokens for the Angular app
- Provide sync configuration to authenticated users

## Prerequisites

- CouchDB installed and running (default: http://localhost:5984)
- Node.js and npm installed
- Angular CLI installed

## Step 1: Configure CouchDB

1. **Install CouchDB** if not already installed:
   - Ubuntu/Debian: `sudo apt-get install couchdb`
   - macOS: `brew install couchdb`
   - Or download from: https://couchdb.apache.org/

2. **Start CouchDB**:
   ```bash
   # Ubuntu/Debian
   sudo systemctl start couchdb
   
   # macOS
   brew services start couchdb
   ```

3. **Set up admin user** (if not already done):
   - Visit: http://localhost:5984/_utils
   - Click "Setup" and follow the wizard
   - Or use curl:
     ```bash
     curl -X PUT http://localhost:5984/_node/_local/_config/admins/admin -d '"your_password"'
     ```

4. **Enable CORS** (required for browser access):
   ```bash
   # Replace admin:password with your credentials
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer"'
   ```

5. **Verify CouchDB is running**:
   ```bash
   curl http://localhost:5984
   ```
   You should see a JSON response with CouchDB version info.

## Step 2: Set Up Auth Server

1. **Navigate to the auth server directory**:
   ```bash
   cd auth-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your configuration**:
   ```env
   # CouchDB Configuration
   COUCHDB_URL=http://localhost:5984
   COUCHDB_ADMIN_USER=admin
   COUCHDB_ADMIN_PASSWORD=your_admin_password
   
   # JWT Configuration
   JWT_SECRET=your_secure_random_secret_key_here
   JWT_EXPIRES_IN=7d
   
   # Server Configuration
   PORT=3001
   ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4000
   ```

   **Important**: 
   - Replace `your_admin_password` with your CouchDB admin password
   - Generate a strong random string for `JWT_SECRET` (e.g., use: `openssl rand -base64 32`)
   - Add any additional origins you need for CORS

5. **Start the auth server**:
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

6. **Verify the auth server is running**:
   ```bash
   curl http://localhost:3001/health
   ```
   You should see: `{"status":"ok","timestamp":"..."}`

## Step 3: Configure Angular App

The Angular app is already configured to work with the auth server at `http://localhost:3001`.

If you need to change the auth server URL, edit:
- `src/app/services/auth.service.ts` - Update `AUTH_SERVER_URL`

## Step 4: Run the Application

1. **Start the Angular development server**:
   ```bash
   npm start
   ```

2. **Open your browser** to: http://localhost:4200

3. **Register a new account**:
   - Click "Register here" or navigate to `/register`
   - Enter a username (letters, numbers, underscores only, min 3 chars)
   - Enter a password (min 6 chars)
   - Click "Register"

4. **You'll be automatically logged in** and redirected to the main app

5. **Your data will now sync** with CouchDB automatically!

## How It Works

### User Registration Flow

1. User submits registration form in Angular app
2. Angular app sends credentials to auth server (`POST /register`)
3. Auth server:
   - Creates user in CouchDB `_users` database
   - Creates per-user database (e.g., `userdb-75736572313233`)
   - Sets database permissions (user can read/write their own db)
   - Generates JWT token
4. Angular app receives token and stores it
5. Database service automatically sets up PouchDB sync with user's CouchDB database

### Login Flow

1. User submits login form
2. Auth server verifies credentials with CouchDB
3. Auth server issues JWT token
4. Angular app stores token and sets up sync

### Data Sync

- **Local First**: All data is stored in local PouchDB (IndexedDB)
- **Automatic Sync**: When authenticated, changes sync bidirectionally with CouchDB
- **Offline Support**: App works offline, syncs when connection restored
- **Per-User Data**: Each user has their own isolated database

## Database Structure

### User Databases

Each user gets a database named: `userdb-<hex_encoded_username>`

Example:
- Username: `john_doe`
- Database: `userdb-6a6f686e5f646f65`

### Security

- Users can only access their own database
- Admin can access all databases
- Database permissions are set automatically by the auth server

## Troubleshooting

### Auth server won't start

- Check CouchDB is running: `curl http://localhost:5984`
- Verify admin credentials in `.env`
- Check port 3001 is not in use: `lsof -i :3001`

### Can't register/login

- Check auth server is running: `curl http://localhost:3001/health`
- Check browser console for CORS errors
- Verify CORS is enabled in CouchDB (see Step 1)
- Check auth server logs for errors

### Sync not working

- Check browser console for sync errors
- Verify user database exists in CouchDB: http://localhost:5984/_utils
- Check database permissions are correct
- Try force sync: Call `databaseService.forceSyncNow()` in browser console

### CORS errors

Make sure CORS is properly configured in CouchDB (see Step 1, item 4).

You can verify CORS settings:
```bash
curl http://admin:password@localhost:5984/_node/_local/_config/cors
```

## Production Deployment

### Security Considerations

1. **Use HTTPS** for all connections
2. **Secure JWT_SECRET** - Use a strong random key
3. **Secure CouchDB** - Use strong admin password
4. **Rate Limiting** - Add rate limiting to auth endpoints
5. **Environment Variables** - Never commit `.env` file
6. **Database Backups** - Set up regular CouchDB backups
7. **Monitor Logs** - Set up logging and monitoring

### Deployment Options

#### Auth Server
- Deploy to: Heroku, DigitalOcean, AWS, etc.
- Use environment variables for configuration
- Set up SSL/TLS certificates

#### CouchDB
- Use managed CouchDB (e.g., IBM Cloudant)
- Or self-host with proper security
- Configure firewall rules
- Set up replication for redundancy

#### Angular App
- Build: `npm run build`
- Deploy static files to: Netlify, Vercel, GitHub Pages, etc.
- Update `AUTH_SERVER_URL` to production URL

## API Reference

See `auth-server/README.md` for detailed API documentation.

## Additional Resources

- [CouchDB Documentation](https://docs.couchdb.org/)
- [PouchDB Documentation](https://pouchdb.com/guides/)
- [CouchDB Security](https://docs.couchdb.org/en/stable/intro/security.html)
- [PouchDB Authentication](https://pouchdb.com/guides/authentication.html)
