const crypto = require('crypto');

// Store active sessions (in production, use a database)
const sessions = new Map();

// Generate a secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify credentials against hardcoded users (in production, use a database)
function verifyCredentials(username, password) {
  // CHANGE THESE CREDENTIALS!
  const users = {
    'admin': {
      password: 'SecurePassword123!',
      name: 'Administrator'
    }
    // Add more users here:
    // 'student1': {
    //   password: 'Password123!',
    //   name: 'Student One'
    // }
  };

  const user = users[username];
  if (!user) return null;
  
  if (user.password !== password) return null;
  
  return {
    username: username,
    name: user.name
  };
}

exports.handler = async (event) => {
  // Add security headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  };

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username and password required' })
      };
    }

    // Verify user credentials
    const user = verifyCredentials(username, password);

    if (!user) {
      return {
        statusCode: 401,
        headers,
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
      headers,
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
      headers,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};

// Make sessions available to other functions
global.authSessions = sessions;
