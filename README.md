# ListSorter

A powerful Angular application for sorting and ranking lists using merge sort algorithm with tier-based results. Features user authentication, offline support, and automatic cloud synchronization with AppWrite.

## Features

- 🔐 **User Authentication** - Secure email-based authentication with AppWrite
- 📊 **Merge Sort Algorithm** - Efficient pairwise comparison sorting
- 🎯 **Tier-Based Results** - Organize items into customizable tiers (S, A, B, C, etc.)
- 💾 **Offline Support** - Works offline with local RxDB storage (Dexie)
- ☁️ **Cloud Sync** - Automatic bidirectional sync with AppWrite
- 📱 **PWA Support** - Install as a Progressive Web App
- 🎨 **Material Design** - Modern UI with Angular Material
- 🔄 **Drag & Drop** - Reorder items with intuitive drag and drop
- ⚡ **Reactive Data** - Real-time updates with RxDB observables

## Quick Start

### ⚡ AppWrite Setup (5 minutes)

1. **Start AppWrite**:
   ```bash
   docker run -d --name appwrite -p 80:80 -e _APP_OPENSSL_KEY_V1=your-secret-key appwrite/appwrite:latest
   ```

2. **Configure AppWrite** (http://localhost):
   - Create project and copy Project ID
   - Create database: `list-sorter-db`
   - Create collection: `lists` (see [QUICKSTART_APPWRITE.md](./QUICKSTART_APPWRITE.md) for attributes)
   - Enable Email/Password auth

3. **Update environment**:
   Edit `src/environments/environment.ts` with your Project ID

4. **Run the app**:
   ```bash
   npm install
   npm start
   ```

5. **Open http://localhost:4200** and register!

📖 **Detailed Guide**: [QUICKSTART_APPWRITE.md](./QUICKSTART_APPWRITE.md)

### 💻 Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The app will run at `http://localhost:4200/` with hot reload enabled.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Documentation

### AppWrite + RxDB (Current)
- **[QUICKSTART_APPWRITE.md](./QUICKSTART_APPWRITE.md)** - Get started in 5 minutes
- **[APPWRITE_SETUP.md](./APPWRITE_SETUP.md)** - Detailed AppWrite setup guide
- **[MIGRATION_NOTES.md](./MIGRATION_NOTES.md)** - What changed from CouchDB/PouchDB

### General
- **[README_APP.md](./README_APP.md)** - Application features and usage
- **[PWA-SETUP.md](./PWA-SETUP.md)** - Progressive Web App setup
- **[DRAG_DROP_FEATURE.md](./DRAG_DROP_FEATURE.md)** - Drag and drop implementation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Frontend                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │   Database   │  │  Components  │  │
│  │              │  │   Service    │  │              │  │
│  │  - AppWrite  │  │  - RxDB      │  │  - Sorting   │  │
│  │  - Email     │  │  - Dexie     │  │  - Results   │  │
│  │  - Sessions  │  │  - Reactive  │  │  - Lists     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                              │
└─────────┼─────────────────┼──────────────────────────────┘
          │                 │
          │ AppWrite SDK    │ Replication (Push/Pull)
          │                 │
          ▼                 ▼
┌──────────────────────────────────────┐
│            AppWrite Server            │
│                                       │
│  ┌─────────────┐  ┌─────────────┐   │
│  │    Auth     │  │  Database   │   │
│  │             │  │             │   │
│  │ - Users     │  │ - Lists     │   │
│  │ - Sessions  │  │ - Per-user  │   │
│  │ - Email     │  │ - Realtime  │   │
│  └─────────────┘  └─────────────┘   │
└──────────────────────────────────────┘
```

## Scripts

### Development
- `npm start` - Start Angular development server
- `npm run build` - Build for production
- `npm test` - Run unit tests

### AppWrite
- `docker run -d --name appwrite -p 80:80 appwrite/appwrite:latest` - Start AppWrite

## Technology Stack

- **Frontend**: Angular 20, Angular Material, RxJS
- **Database**: RxDB (local), AppWrite (remote)
- **Storage**: Dexie.js (IndexedDB wrapper)
- **Authentication**: AppWrite SDK
- **PWA**: Angular Service Worker
- **Build**: Vite, Angular CLI

## Additional Resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [AppWrite Documentation](https://appwrite.io/docs)
- [RxDB Documentation](https://rxdb.info/)
- [Dexie.js Documentation](https://dexie.org/)
