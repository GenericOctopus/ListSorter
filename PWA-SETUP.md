# PWA Setup for List Sorter

## Overview
List Sorter is now configured as a Progressive Web App (PWA) with offline-first capabilities.

## Features Implemented

### 1. Service Worker Registration
- **Location**: `src/app/app.config.ts`
- **Strategy**: Registers when the app is stable (after 30 seconds)
- **Environment**: Only enabled in production builds (not in dev mode)

### 2. Offline-First Architecture
- **PouchDB**: Local database that works offline by default
- **Service Worker**: Caches app shell and assets
- **Data Persistence**: All user data stored locally in IndexedDB via PouchDB

### 3. App Manifest
- **Location**: `public/manifest.webmanifest`
- **Features**:
  - App name and description
  - Theme color: `#667eea` (purple gradient)
  - Icons for all device sizes (72x72 to 512x512)
  - Standalone display mode
  - Installable on mobile and desktop

### 4. Service Worker Configuration
- **Location**: `ngsw-config.json`
- **Asset Groups**:
  - **app**: Prefetches core app files (HTML, CSS, JS)
  - **assets**: Lazy loads images and fonts
- **Data Groups**: Configured for API caching (if needed in future)

### 5. Update Management
- **Service**: `src/app/services/pwa.service.ts`
- **Features**:
  - Automatic update checks every 6 hours
  - User prompt when new version is available
  - Seamless update activation

## How It Works

### Installation
1. User visits the app in a browser
2. Browser detects the manifest and service worker
3. "Add to Home Screen" prompt appears (on supported devices)
4. App installs like a native app

### Offline Usage
1. **First Visit**: App downloads and caches all assets
2. **Subsequent Visits**: Loads instantly from cache
3. **Offline Mode**: Full functionality available without internet
4. **Data Sync**: PouchDB stores all data locally (can sync to CouchDB if configured)

### Updates
1. Service worker checks for updates every 6 hours
2. When update found, user is prompted
3. User accepts → app reloads with new version
4. Seamless update without data loss

## Building for Production

### Development Mode
```bash
npm start
# Service worker is DISABLED in dev mode
```

### Production Build
```bash
npm run build
# Service worker is ENABLED
# Output in dist/ folder
```

### Testing PWA Locally
```bash
# Build production version
npm run build

# Serve with a simple HTTP server
npx http-server dist/ListSorter/browser -p 8080

# Open http://localhost:8080
# Check DevTools > Application > Service Workers
```

## PWA Checklist

✅ **Service Worker**: Registered and caching assets
✅ **Manifest**: Configured with icons and metadata
✅ **HTTPS**: Required for PWA (works on localhost for testing)
✅ **Offline**: App works without internet connection
✅ **Installable**: Can be added to home screen
✅ **Fast**: Instant loading from cache
✅ **Responsive**: Works on all screen sizes
✅ **Update Strategy**: Automatic checks with user prompts

## Testing PWA Features

### Chrome DevTools
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check:
   - **Manifest**: Verify app name, icons, theme color
   - **Service Workers**: Should show "activated and running"
   - **Cache Storage**: Should show cached assets
   - **IndexedDB**: Should show PouchDB database

### Lighthouse Audit
1. Open DevTools
2. Go to **Lighthouse** tab
3. Select **Progressive Web App**
4. Click **Generate report**
5. Should score 90+ for PWA

### Offline Testing
1. Open app in browser
2. Open DevTools > Network tab
3. Check "Offline" checkbox
4. Reload page
5. App should still work fully

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 11.3+)
- ✅ Samsung Internet
- ⚠️ IE11: Not supported (modern browsers only)

## Future Enhancements

### Potential Additions:
1. **Background Sync**: Sync data when connection restored
2. **Push Notifications**: Notify users of updates
3. **Share Target**: Allow sharing lists to the app
4. **CouchDB Sync**: Optional cloud backup
5. **Offline Analytics**: Track usage patterns

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure running on HTTPS or localhost
- Clear browser cache and reload
- Check `isDevMode()` returns false in production

### App Not Installable
- Verify manifest.webmanifest is accessible
- Check all required manifest fields are present
- Ensure at least one icon is 192x192 or larger
- Must be served over HTTPS

### Updates Not Working
- Check service worker is registered
- Verify ngsw-config.json is valid
- Clear service worker in DevTools
- Hard reload (Ctrl+Shift+R)

## Resources

- [Angular PWA Guide](https://angular.dev/ecosystem/service-workers)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
