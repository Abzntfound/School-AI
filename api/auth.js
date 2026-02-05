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
  };

  console.log('=== VERIFY CREDENTIALS ===');
  console.log('Looking for username:', username);
  console.log('Available users:', Object.keys(users));
  
  const user = users[username];
  if (!user) {
    console.log('❌ User not found:', username);
    return null;
  }
  
  console.log('✓ User found:', username);
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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    console.log('=== AUTH DEBUG ===');
    console.log('Username:', username);
    console.log('Password length:', password ? password.length : 'null');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Verify user credentials
    const user = verifyCredentials(username, password);

    if (!user) {
      console.log('Authentication failed for:', username);
      return res.status(401).json({ 
        error: 'Invalid username or password',
        debug: `Tried username: "${username}"`
      });
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

    // Make sessions available globally
    global.authSessions = sessions;

    return res.status(200).json({ 
      token,
      username: user.username,
      name: user.name
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
