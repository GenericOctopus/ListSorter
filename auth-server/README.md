# ListSorter Authentication Server

This is the authentication server for the ListSorter application. It handles user registration and login with CouchDB, creating per-user databases with proper permissions.

## Why This Server?

CouchDB doesn't allow non-admin users to create accounts in the `_users` database. This server uses admin credentials to:
- Create user accounts in CouchDB
- Create per-user databases
- Set proper security permissions
- Issue JWT tokens for the Angular app

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
   - Your CouchDB URL
   - CouchDB admin credentials
   - A secure JWT secret
   - Server port (default: 3001)

4. Make sure CouchDB is running and accessible

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### POST /register
Register a new user.

**Request:**
```json
{
  "username": "user123",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "username": "user123",
  "dbName": "userdb-75736572313233"
}
```

### POST /login
Login an existing user.

**Request:**
```json
{
  "username": "user123",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "username": "user123",
  "dbName": "userdb-75736572313233"
}
```

### GET /verify
Verify a JWT token (requires Authorization header).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "username": "user123",
  "dbName": "userdb-75736572313233"
}
```

### GET /sync-config
Get CouchDB sync configuration (requires Authorization header).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "dbName": "userdb-75736572313233",
  "couchUrl": "http://localhost:5984",
  "username": "user123"
}
```

## Security Notes

- Never commit your `.env` file
- Use strong admin passwords
- Change the JWT_SECRET in production
- Use HTTPS in production
- Consider rate limiting for production use
- The JWT token expires after 7 days by default (configurable)

## Database Naming

User databases are named using the pattern: `userdb-<hex_encoded_username>`

This follows CouchDB's per-user database convention and ensures unique database names.
