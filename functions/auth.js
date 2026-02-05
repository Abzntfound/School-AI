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
      password: 'admin123',
      name: 'Administrator'
    },
    'student': {
      password: 'student123',
      name: 'Student'
    }
    // Add more users here:
    // 'yourname': {
    //   password: 'yourpass',
    //   name: 'Your Name'
    // }
  };

  console.log('=== VERIFY CREDENTIALS ===');
  console.log('Looking for username:', username);
  console.log('Available users:', Object.keys(users));
  console.log('Username trimmed:', username.trim());
  console.log('Password received length:', password.length);
  
  const user = users[username];
  if (!user) {
    console.log('❌ User not found:', username);
    console.log('Did you mean "admin" or "student"?');
    return null;
  }
  
  console.log('✓ User found:', username);
  console.log('Expected password:', user.password);
  console.log('Received password:', password);
  console.log('Passwords match:', user.password === password);
  
  if (user.password !== password) {
    console.log('❌ Invalid password for user:', username);
    return null;
  }
  
  console.log('✅ Login successful for user:', username);
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
    const bodyData = JSON.parse(event.body);
    const { username, password } = bodyData;

    console.log('=== AUTH DEBUG ===');
    console.log('Raw body:', event.body);
    console.log('Parsed username:', username);
    console.log('Parsed password:', password);
    console.log('Username length:', username ? username.length : 'null');
    console.log('Password length:', password ? password.length : 'null');
    console.log('Username bytes:', username ? Buffer.from(username).toString('hex') : 'null');

    if (!username || !password) {
      console.log('Missing credentials');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username and password required' })
      };
    }

    // Verify user credentials
    const user = verifyCredentials(username, password);

    if (!user) {
      console.log('Authentication failed for:', username);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid username or password',
          debug: `Tried username: "${username}"`
        })
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
