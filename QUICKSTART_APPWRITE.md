# Quick Start - AppWrite + RxDB

Get up and running with ListSorter using AppWrite in 5 minutes.

## Prerequisites

- Docker installed (for local AppWrite)
- Node.js and npm installed

## Step 1: Start AppWrite (2 minutes)

```bash
# Pull and run AppWrite
docker run -d \
  --name appwrite \
  -p 80:80 \
  -p 443:443 \
  -e _APP_OPENSSL_KEY_V1=your-secret-key \
  appwrite/appwrite:latest

# Wait for AppWrite to start (about 30 seconds)
# Then open http://localhost
```

## Step 2: Configure AppWrite (2 minutes)

1. **Open http://localhost** and create admin account

2. **Create Project:**
   - Name: `ListSorter`
   - Copy the Project ID

3. **Add Web Platform:**
   - Settings → Platforms → Add Platform → Web
   - Hostname: `localhost`

4. **Create Database:**
   - Databases → Create Database
   - ID: `list-sorter-db`

5. **Create Collection:**
   - Create Collection
   - ID: `lists`
   - Permissions: Add "Users" role with all permissions (Create, Read, Update, Delete)

6. **Add Attributes** (click Create Attribute for each):
   - `listName` - String (200) - Required
   - `items` - String (1000) - Required - Array
   - `sortedItems` - String (1000) - Array
   - `tieredItems` - String (5000)
   - `completed` - Boolean - Required
   - `createdAt` - Integer - Required
   - `completedAt` - Integer
   - `userId` - String (100) - Required
   - `updatedAt` - Integer - Required

7. **Create Indexes:**
   - `userId` - key - userId
   - `createdAt` - key - createdAt
   - `updatedAt` - key - updatedAt

8. **Enable Auth:**
   - Auth → Settings → Enable "Email/Password"

## Step 3: Configure App (1 minute)

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  appwrite: {
    endpoint: 'http://localhost/v1',
    projectId: 'YOUR_PROJECT_ID', // Paste your project ID here
    databaseId: 'list-sorter-db',
    collectionsId: {
      lists: 'lists'
    }
  }
};
```

## Step 4: Run the App

```bash
# Install dependencies (if not already done)
npm install

# Start the app
npm start

# Open http://localhost:4200
```

## Step 5: Test It

1. Click "Register"
2. Enter email, name, password
3. Create a list and start sorting!

Your data is now syncing to AppWrite! ✨

## Troubleshooting

**Can't connect to AppWrite?**
- Check Docker: `docker ps` (should see appwrite container)
- Wait 30 seconds after starting AppWrite
- Try restarting: `docker restart appwrite`

**Registration fails?**
- Check Email/Password auth is enabled in AppWrite console
- Verify project ID in environment.ts
- Check browser console for errors

**Data not syncing?**
- Verify collection permissions include "Users" role
- Check indexes are created
- Look for errors in browser console

## Next Steps

- Read `APPWRITE_SETUP.md` for detailed setup
- Read `MIGRATION_NOTES.md` for what changed
- Deploy to production with AppWrite Cloud

## Production Deployment

For production, use AppWrite Cloud:

1. Sign up at https://cloud.appwrite.io
2. Create project and configure as above
3. Update `environment.ts`:
   ```typescript
   endpoint: 'https://cloud.appwrite.io/v1',
   projectId: 'YOUR_CLOUD_PROJECT_ID'
   ```
4. Add your production domain to platforms
5. Deploy your Angular app

That's it! 🚀
