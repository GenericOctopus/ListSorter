# Migration from CouchDB/PouchDB to AppWrite/RxDB

## Summary of Changes

This document outlines the migration from CouchDB/PouchDB to AppWrite/RxDB with Dexie storage.

## What Changed

### Dependencies

**Removed:**
- `pouchdb` - Replaced by RxDB
- `@types/pouchdb` - No longer needed

**Added:**
- `rxdb` - Local-first reactive database
- `dexie` - IndexedDB wrapper (used by RxDB)
- `appwrite` - AppWrite SDK for authentication and backend

### Architecture

**Before:**
```
Angular App
    ↓
PouchDB (local) ←→ CouchDB (remote)
    ↓
Custom Auth Server (JWT)
```

**After:**
```
Angular App
    ↓
RxDB + Dexie (local) ←→ AppWrite (remote)
    ↓
AppWrite SDK (authentication)
```

### Code Changes

#### 1. Authentication (`auth.service.ts`)

**Before:**
- Custom auth server at `http://localhost:3001`
- Username-based authentication
- JWT token management
- Manual session storage

**After:**
- AppWrite SDK
- Email-based authentication
- Session managed by AppWrite
- Built-in token refresh

**API Changes:**
```typescript
// Before
await authService.register(username, password);
await authService.login(username, password);

// After
await authService.register(email, password, name);
await authService.login(email, password);
```

**User Object:**
```typescript
// Before
interface AuthUser {
  username: string;
  token: string;
  dbName: string;
}

// After
interface AuthUser {
  userId: string;
  email: string;
  name: string;
}
```

#### 2. Database Service (`database.service.ts`)

**Before:**
- PouchDB with CouchDB sync
- Document-based with `_id` and `_rev`
- Promise-based API
- Automatic sync via PouchDB replication

**After:**
- RxDB with Dexie storage
- Schema-based documents
- Observable-based API (reactive)
- Custom replication with AppWrite

**API Changes:**
```typescript
// Before
const lists = await db.getAllLists(); // Promise

// After
const lists = await db.getAllLists(); // Still works
db.getAllLists$().subscribe(lists => { }); // New reactive API
```

**Document Structure:**
```typescript
// Before
interface SortedList {
  _id?: string;
  _rev?: string;
  listName: string;
  items: string[];
  // ...
  createdAt: Date;
}

// After (internal RxDB format)
interface SortedListDocument {
  id: string;
  listName: string;
  items: string[];
  // ...
  createdAt: number; // timestamp
  userId: string; // new field
  updatedAt: number; // new field for sync
}

// Converted to SortedList for backward compatibility
```

#### 3. Components

**Login/Register Components:**
- Changed from username to email
- Added name field to registration
- Password minimum changed from 6 to 8 characters

**Auth Widget:**
- Removed server availability check
- Updated to show user name/email instead of username

### File Structure

**Removed:**
- `/auth-server/` - Entire directory
- `setup-auth.sh` - No longer needed
- `AUTH_SETUP.md` - Replaced by `APPWRITE_SETUP.md`

**Added:**
- `src/environments/environment.ts` - AppWrite configuration
- `src/environments/environment.development.ts` - Development config
- `src/app/services/rxdb-schemas.ts` - RxDB schema definitions
- `APPWRITE_SETUP.md` - New setup guide
- `MIGRATION_NOTES.md` - This file

**Modified:**
- `src/app/services/auth.service.ts` - Complete rewrite
- `src/app/services/database.service.ts` - Complete rewrite
- `src/app/components/login/` - Updated for email auth
- `src/app/components/register/` - Updated for email auth
- `src/app/components/auth-widget/` - Updated UI
- `package.json` - Updated dependencies

## Breaking Changes

### 1. Authentication

**Username → Email:**
- Users must now register with email addresses
- Existing username-based accounts cannot be migrated automatically

**Password Requirements:**
- Minimum length increased from 6 to 8 characters
- AppWrite enforces additional security requirements

### 2. Data Model

**Document IDs:**
- Still use `_id` in the API for backward compatibility
- Internally stored as `id` in RxDB

**Revisions:**
- No more `_rev` field
- Conflict resolution handled differently
- Uses `updatedAt` timestamp for sync

**User Association:**
- All documents now have a `userId` field
- Users can only access their own data

### 3. Sync Behavior

**Manual Setup Required:**
- Must configure AppWrite instance
- Must create database and collection
- Must set up permissions

**Replication:**
- No longer automatic on app start
- Requires authentication first
- Uses custom push/pull handlers

## Migration Path

### For New Installations

1. Follow `APPWRITE_SETUP.md`
2. Set up AppWrite instance
3. Configure environment files
4. Run the app

### For Existing Installations

**Option 1: Fresh Start (Recommended)**
1. Users re-register with email
2. Manually recreate their lists

**Option 2: Data Migration (Advanced)**
1. Export data from CouchDB
2. Transform to new schema:
   ```javascript
   {
     id: doc._id,
     listName: doc.listName,
     items: doc.items,
     sortedItems: doc.sortedItems,
     tieredItems: JSON.stringify(doc.tieredItems),
     completed: doc.completed,
     createdAt: new Date(doc.createdAt).getTime(),
     completedAt: doc.completedAt ? new Date(doc.completedAt).getTime() : null,
     userId: 'USER_ID_FROM_APPWRITE',
     updatedAt: Date.now()
   }
   ```
3. Import to AppWrite via API
4. Map old usernames to new AppWrite user IDs

## Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] User logout works
- [ ] Lists are created and saved
- [ ] Lists sync to AppWrite
- [ ] Lists load after refresh
- [ ] Offline mode works
- [ ] Sync resumes after going online
- [ ] Multiple devices sync correctly
- [ ] User can only see their own lists
- [ ] Drag and drop still works
- [ ] Tier calculations work
- [ ] List deletion works

## Known Issues

### TypeScript Warnings

Some TypeScript warnings may appear related to RxDB types. These are non-critical and don't affect functionality:
- Deep readonly types in conversions
- Replication handler types

### Sync Timing

- Initial sync may take a moment after login
- Large lists may sync in batches
- Check browser console for sync status

## Rollback Plan

If you need to rollback to CouchDB/PouchDB:

1. Checkout the previous branch
2. Run `npm install` to restore old dependencies
3. Start CouchDB and auth server
4. Data in AppWrite will remain but won't be accessible

## Performance Considerations

### Improvements
- RxDB is faster for large datasets
- Dexie has better IndexedDB performance
- Reactive queries reduce unnecessary renders

### Trade-offs
- Initial setup is more complex
- Custom replication code to maintain
- Schema changes require migrations

## Security Improvements

1. **Built-in Security:**
   - AppWrite handles authentication securely
   - No custom JWT implementation
   - Session management is automatic

2. **Permissions:**
   - Database-level permissions
   - Users can't access other users' data
   - No need for per-user databases

3. **Best Practices:**
   - HTTPS enforced in production
   - CORS properly configured
   - Rate limiting available

## Future Enhancements

Possible improvements with AppWrite:

1. **Email Verification:**
   - Add email verification on registration
   - Use AppWrite's built-in email service

2. **Password Recovery:**
   - Implement password reset flow
   - Use AppWrite's recovery endpoints

3. **OAuth:**
   - Add Google/GitHub login
   - Use AppWrite's OAuth providers

4. **Realtime:**
   - Use AppWrite's realtime subscriptions
   - Live updates across devices

5. **File Storage:**
   - Store tier list images
   - Use AppWrite's storage service

6. **Functions:**
   - Server-side list processing
   - Automated backups

## Support

For issues or questions:
1. Check `APPWRITE_SETUP.md` for setup instructions
2. Review AppWrite documentation
3. Check RxDB documentation
4. Review browser console for errors

## Conclusion

The migration to AppWrite + RxDB provides:
- ✅ Simpler infrastructure
- ✅ Better developer experience
- ✅ Modern authentication
- ✅ Reactive data layer
- ✅ Built-in features for future enhancements

The trade-off is initial setup complexity, but the long-term benefits outweigh the migration effort.
