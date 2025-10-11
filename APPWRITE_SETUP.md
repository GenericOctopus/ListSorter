# AppWrite + RxDB Setup Guide

This guide will help you set up AppWrite and configure the ListSorter application to use AppWrite for authentication and data synchronization with RxDB.

## Architecture Overview

The new authentication and database system consists of:

1. **AppWrite** - Backend-as-a-Service for authentication and database
2. **RxDB** - Local-first reactive database with Dexie.js storage
3. **Angular App** - Frontend with AppWrite SDK integration

### Why AppWrite + RxDB?

- **Simplified Infrastructure**: No separate auth server or CouchDB to maintain
- **Built-in Features**: Authentication, database, file storage, functions, realtime
- **Reactive Queries**: RxDB provides powerful observable-based queries
- **Offline-First**: Data stored locally with automatic sync to AppWrite
- **Modern Stack**: Better TypeScript support and developer experience

## Prerequisites

- Node.js and npm installed
- Docker and Docker Compose (for local AppWrite instance)
- Angular CLI installed

## Step 1: Set Up AppWrite

### Option A: Local Development (Recommended for testing)

1. **Install AppWrite using Docker**:
   ```bash
   docker run -d \
     --name appwrite \
     -p 80:80 \
     -p 443:443 \
     -v appwrite-data:/storage/uploads \
     -v appwrite-cache:/storage/cache \
     -v appwrite-config:/storage/config \
     -v appwrite-certificates:/storage/certificates \
     -v appwrite-functions:/storage/functions \
     -e _APP_OPENSSL_KEY_V1=your-secret-key \
     appwrite/appwrite:latest
   ```

   Or use Docker Compose (create `docker-compose.appwrite.yml`):
   ```yaml
   version: '3'
   services:
     appwrite:
       image: appwrite/appwrite:latest
       container_name: appwrite
       restart: unless-stopped
       ports:
         - "80:80"
         - "443:443"
       environment:
         - _APP_OPENSSL_KEY_V1=your-secret-key
         - _APP_DOMAIN=localhost
         - _APP_DOMAIN_TARGET=localhost
       volumes:
         - appwrite-data:/storage/uploads
         - appwrite-cache:/storage/cache
         - appwrite-config:/storage/config
         - appwrite-certificates:/storage/certificates
         - appwrite-functions:/storage/functions
   
   volumes:
     appwrite-data:
     appwrite-cache:
     appwrite-config:
     appwrite-certificates:
     appwrite-functions:
   ```

   Then run:
   ```bash
   docker-compose -f docker-compose.appwrite.yml up -d
   ```

2. **Access AppWrite Console**:
   - Open: http://localhost
   - Complete the setup wizard
   - Create an admin account

### Option B: AppWrite Cloud (Recommended for production)

1. Go to https://cloud.appwrite.io
2. Create a free account
3. Create a new project

## Step 2: Configure AppWrite Project

1. **Create a New Project**:
   - Name: `ListSorter`
   - Project ID: (copy this, you'll need it)

2. **Add a Web Platform**:
   - Go to Project Settings → Platforms
   - Click "Add Platform" → Web
   - Name: `ListSorter Web`
   - Hostname: `localhost` (for development)
   - For production, add your actual domain

3. **Create Database**:
   - Go to Databases
   - Click "Create Database"
   - Database ID: `list-sorter-db`
   - Name: `ListSorter Database`

4. **Create Collection**:
   - Inside the database, click "Create Collection"
   - Collection ID: `lists`
   - Name: `Lists`
   
5. **Add Attributes to Collection**:
   Click "Create Attribute" for each:
   
   | Attribute | Type | Size | Required | Array | Default |
   |-----------|------|------|----------|-------|---------|
   | listName | String | 200 | Yes | No | - |
   | items | String | 1000 | Yes | Yes | - |
   | sortedItems | String | 1000 | No | Yes | - |
   | tieredItems | String | 5000 | No | No | - |
   | completed | Boolean | - | Yes | No | false |
   | createdAt | Integer | - | Yes | No | - |
   | completedAt | Integer | - | No | No | - |
   | userId | String | 100 | Yes | No | - |
   | updatedAt | Integer | - | Yes | No | - |

6. **Create Indexes**:
   - Index 1: Key: `userId`, Type: `key`, Attributes: `userId`
   - Index 2: Key: `createdAt`, Type: `key`, Attributes: `createdAt`
   - Index 3: Key: `updatedAt`, Type: `key`, Attributes: `updatedAt`

7. **Set Collection Permissions**:
   - Go to Settings → Permissions
   - Add Role: `Users`
   - Permissions: 
     - Read: ✓ (Users can read their own documents)
     - Create: ✓ (Users can create documents)
     - Update: ✓ (Users can update their own documents)
     - Delete: ✓ (Users can delete their own documents)

8. **Enable Authentication Methods**:
   - Go to Auth → Settings
   - Enable "Email/Password"
   - Configure session length (default: 365 days)
   - Optional: Enable other methods (OAuth, Magic URL, etc.)

## Step 3: Configure Angular App

1. **Update Environment Files**:

   Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     appwrite: {
       endpoint: 'http://localhost/v1', // or 'https://cloud.appwrite.io/v1' for cloud
       projectId: 'YOUR_PROJECT_ID',    // Replace with your project ID
       databaseId: 'list-sorter-db',
       collectionsId: {
         lists: 'lists'
       }
     }
   };
   ```

   Edit `src/environments/environment.development.ts` with the same values.

2. **For Production**, create `src/environments/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     appwrite: {
       endpoint: 'https://cloud.appwrite.io/v1', // or your self-hosted URL
       projectId: 'YOUR_PRODUCTION_PROJECT_ID',
       databaseId: 'list-sorter-db',
       collectionsId: {
         lists: 'lists'
       }
     }
   };
   ```

## Step 4: Run the Application

1. **Install Dependencies** (already done):
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm start
   ```

3. **Open your browser** to: http://localhost:4200

4. **Register a new account**:
   - Click "Register"
   - Enter email, name, and password (min 8 characters)
   - You'll be automatically logged in

5. **Your data will now sync** with AppWrite automatically!

## How It Works

### User Registration Flow

1. User submits registration form in Angular app
2. AppWrite SDK creates user account
3. AppWrite creates email/password session
4. Angular app stores session (handled by AppWrite SDK)
5. RxDB automatically sets up replication with AppWrite database

### Login Flow

1. User submits login form
2. AppWrite SDK verifies credentials
3. AppWrite creates session
4. RxDB sets up sync with user's data

### Data Sync

- **Local First**: All data is stored in local RxDB (IndexedDB via Dexie)
- **Automatic Sync**: When authenticated, changes sync bidirectionally with AppWrite
- **Offline Support**: App works offline, syncs when connection restored
- **Per-User Data**: Each user only sees their own lists (enforced by AppWrite permissions)

## Database Structure

### Lists Collection

Each list document contains:
- `id`: Unique identifier
- `listName`: Name of the list
- `items`: Array of original items
- `sortedItems`: Array of sorted items
- `tieredItems`: JSON string of tier groups
- `completed`: Boolean flag
- `createdAt`: Timestamp (milliseconds)
- `completedAt`: Timestamp (milliseconds, optional)
- `userId`: Owner's user ID
- `updatedAt`: Last update timestamp (for sync)

### Security

- Users can only access their own documents
- AppWrite enforces permissions at the database level
- Sessions are managed securely by AppWrite

## Troubleshooting

### Can't connect to AppWrite

- Check AppWrite is running: `docker ps` (should see appwrite container)
- Verify endpoint in environment files
- Check browser console for CORS errors
- Ensure platform hostname is configured in AppWrite console

### Can't register/login

- Check AppWrite console for errors (Logs section)
- Verify Email/Password auth is enabled
- Check browser console for errors
- Ensure project ID is correct in environment files

### Sync not working

- Check browser console for sync errors
- Verify collection permissions are set correctly
- Check that indexes are created
- Try force sync: Open browser console and run:
  ```javascript
  // Get the database service
  const dbService = document.querySelector('app-root').__ngContext__[8].injector.get('DatabaseService');
  dbService.forceSyncNow();
  ```

### Data not appearing

- Check that you're logged in
- Verify userId matches in AppWrite console
- Check collection permissions
- Look for errors in browser console

## Production Deployment

### Security Considerations

1. **Use HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit production credentials
3. **AppWrite Security**: 
   - Use strong admin passwords
   - Enable rate limiting
   - Configure proper CORS origins
4. **Database Backups**: Set up regular backups in AppWrite
5. **Monitor Logs**: Set up logging and monitoring

### Deployment Options

#### AppWrite
- **Cloud**: Use AppWrite Cloud (easiest)
- **Self-hosted**: Deploy to DigitalOcean, AWS, etc.
- Configure SSL/TLS certificates
- Set up proper firewall rules

#### Angular App
- Build: `npm run build`
- Deploy static files to: Netlify, Vercel, GitHub Pages, etc.
- Update environment files with production AppWrite endpoint

## Migration from CouchDB/PouchDB

If you have existing data in CouchDB/PouchDB:

1. Export data from CouchDB
2. Transform to new schema format
3. Import to AppWrite using the API or console
4. Update document IDs and user associations

## Additional Resources

- [AppWrite Documentation](https://appwrite.io/docs)
- [RxDB Documentation](https://rxdb.info/)
- [Dexie.js Documentation](https://dexie.org/)
- [AppWrite Console](http://localhost) (local) or [AppWrite Cloud](https://cloud.appwrite.io)

## API Reference

### AuthService

```typescript
// Register
await authService.register(email, password, name);

// Login
await authService.login(email, password);

// Logout
await authService.logout();

// Check authentication
const isAuth = authService.isAuthenticated;
const user = authService.currentUserValue;
```

### DatabaseService

```typescript
// Save list
await databaseService.saveSortedList(list);

// Get all lists
const lists = await databaseService.getAllLists();

// Get lists (reactive)
databaseService.getAllLists$().subscribe(lists => {
  console.log('Lists updated:', lists);
});

// Delete list
await databaseService.deleteList(id);

// Force sync
await databaseService.forceSyncNow();
```

## What's Different from CouchDB/PouchDB

### Removed
- ❌ Custom auth server (`/auth-server/`)
- ❌ CouchDB setup and configuration
- ❌ JWT token management
- ❌ Manual user database creation
- ❌ `_rev` revision system

### Added
- ✅ AppWrite SDK integration
- ✅ RxDB with Dexie storage
- ✅ Schema validation
- ✅ Reactive queries
- ✅ Built-in authentication
- ✅ Email-based accounts (instead of username)

### Benefits
- Simpler infrastructure (one service instead of two)
- Better TypeScript support
- Modern developer experience
- Built-in features (email verification, password recovery, etc.)
- Easier to scale and maintain
