require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nano = require('nano');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(bodyParser.json());

// CouchDB connection with admin credentials
const couchUrl = process.env.COUCHDB_URL || 'http://localhost:5984';
const adminUser = process.env.COUCHDB_ADMIN_USER;
const adminPassword = process.env.COUCHDB_ADMIN_PASSWORD;

if (!adminUser || !adminPassword) {
  console.error('ERROR: COUCHDB_ADMIN_USER and COUCHDB_ADMIN_PASSWORD must be set');
  process.exit(1);
}

const couchAdmin = nano(`${couchUrl.split('//')[0]}//${adminUser}:${adminPassword}@${couchUrl.split('//')[1]}`);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper function to create user database name
function getUserDbName(username) {
  return `userdb-${Buffer.from(username).toString('hex')}`;
}

// Helper function to create a user in CouchDB _users database
async function createCouchDBUser(username, password) {
  const usersDb = couchAdmin.use('_users');
  const userId = `org.couchdb.user:${username}`;
  
  try {
    // Check if user already exists
    try {
      await usersDb.get(userId);
      return { success: false, error: 'User already exists' };
    } catch (err) {
      // User doesn't exist, continue with creation
    }

    // Create user document
    const userDoc = {
      _id: userId,
      name: username,
      type: 'user',
      roles: [],
      password: password // CouchDB will hash this automatically
    };

    await usersDb.insert(userDoc);
    return { success: true };
  } catch (error) {
    console.error('Error creating CouchDB user:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to create user's personal database
async function createUserDatabase(username) {
  const dbName = getUserDbName(username);
  
  try {
    // Create the database
    await couchAdmin.db.create(dbName);
    
    // Set up security for the database
    const db = couchAdmin.use(dbName);
    await db.insert({
      admins: {
        names: [adminUser],
        roles: []
      },
      members: {
        names: [username],
        roles: []
      }
    }, '_security');

    return { success: true, dbName };
  } catch (error) {
    if (error.statusCode === 412) {
      // Database already exists
      return { success: true, dbName };
    }
    console.error('Error creating user database:', error);
    return { success: false, error: error.message };
  }
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Sanitize username (only alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    // Create CouchDB user
    const userResult = await createCouchDBUser(username, password);
    if (!userResult.success) {
      return res.status(400).json({ error: userResult.error });
    }

    // Create user's personal database
    const dbResult = await createUserDatabase(username);
    if (!dbResult.success) {
      return res.status(500).json({ error: 'Failed to create user database' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username, dbName: dbResult.dbName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      username,
      dbName: dbResult.dbName
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Verify credentials by attempting to authenticate with CouchDB
    const userCouchUrl = `${couchUrl.split('//')[0]}//${username}:${password}@${couchUrl.split('//')[1]}`;
    const userCouch = nano(userCouchUrl);
    
    try {
      // Try to access the session endpoint to verify credentials
      await userCouch.session();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const dbName = getUserDbName(username);

    // Generate JWT token
    const token = jwt.sign(
      { username, dbName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      username,
      dbName
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
app.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    username: req.user.username,
    dbName: req.user.dbName
  });
});

// Get CouchDB credentials for sync (returns URL with user credentials)
app.get('/sync-config', authenticateToken, (req, res) => {
  const { username, dbName } = req.user;
  
  // Return the database URL without credentials
  // The client will need to use their own credentials for sync
  res.json({
    dbName,
    couchUrl: couchUrl,
    username
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log(`CouchDB URL: ${couchUrl}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
