# ListSorter

A powerful Angular application for sorting and ranking lists using merge sort algorithm with tier-based results. Features user authentication, offline support, and automatic cloud synchronization with CouchDB.

## Features

- 🔐 **User Authentication** - Secure login and registration
- 📊 **Merge Sort Algorithm** - Efficient pairwise comparison sorting
- 🎯 **Tier-Based Results** - Organize items into customizable tiers (S, A, B, C, etc.)
- 💾 **Offline Support** - Works offline with local PouchDB storage
- ☁️ **Cloud Sync** - Automatic bidirectional sync with CouchDB
- 📱 **PWA Support** - Install as a Progressive Web App
- 🎨 **Material Design** - Modern UI with Angular Material
- 🔄 **Drag & Drop** - Reorder items with intuitive drag and drop

## Quick Start

### Prerequisites

- Node.js and npm
- CouchDB installed and running
- Angular CLI

### Setup with Authentication (Recommended)

1. **Run the automated setup**:
   ```bash
   ./setup-auth.sh
   ```

2. **Start both servers**:
   ```bash
   ./dev.sh
   ```

3. **Open the app**: http://localhost:4200

4. **Register an account** and start sorting!

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)

### Development server (without auth)

To start just the Angular app:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Detailed authentication setup guide
- **[auth-server/README.md](./auth-server/README.md)** - Auth server API reference
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
│  │  - Login     │  │  - PouchDB   │  │  - Sorting   │  │
│  │  - Register  │  │  - Sync      │  │  - Results   │  │
│  │  - JWT       │  │  - Offline   │  │  - Lists     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                              │
└─────────┼─────────────────┼──────────────────────────────┘
          │                 │
          │ HTTP            │ Sync (PouchDB Protocol)
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Auth Server    │  │    CouchDB      │
│  (Node.js)      │  │                 │
│                 │  │  - _users DB    │
│  - Register     │  │  - Per-user DBs │
│  - Login        │  │  - Replication  │
│  - JWT Tokens   │  │                 │
└─────────┬───────┘  └─────────────────┘
          │
          │ Admin API
          │
          ▼
    CouchDB _users
```

## Scripts

- `npm start` - Start Angular development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `./setup-auth.sh` - Automated authentication setup
- `./dev.sh` - Start both auth server and Angular app

## Technology Stack

- **Frontend**: Angular 20, Angular Material, RxJS
- **Database**: PouchDB (local), CouchDB (remote)
- **Authentication**: JWT, Express.js
- **PWA**: Angular Service Worker
- **Build**: Vite, Angular CLI

## Additional Resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [CouchDB Documentation](https://docs.couchdb.org/)
- [PouchDB Documentation](https://pouchdb.com/)
