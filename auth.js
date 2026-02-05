const crypto = require('crypto');
const credentials = require('./credentials.json');

// Store active sessions (in production, use a database)
const sessions = new Map();

// Generate a secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash password for comparison (basic - in production use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password required' })
      };
    }

    // Find user in credentials
    const user = credentials.users.find(u => u.username === username);

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid username or password' })
      };
    }

    // Check password (plain text comparison - for production, use hashed passwords)
    if (user.password !== password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid username or password' })
      };
    }

    // Generate session token
    const token = generateToken();
    
    // Store session (expires in 24 hours)
    sessions.set(token, {
      username: user.username,
      name: user.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token,
        username: user.username,
        name: user.name
      })
    };

  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};

// Export sessions for use in other functions
exports.sessions = sessions;
