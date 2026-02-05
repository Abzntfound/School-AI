const Anthropic = require('@anthropic-ai/sdk');

// Get sessions from auth function
const getSessions = () => {
  return global.authSessions || new Map();
};

// Verify session token
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const sessions = getSessions();
  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  // Check if session expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

exports.handler = async (event) => {
  // Add security headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify authentication
  const session = verifyToken(event.headers.authorization);
  
  if (!session) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Please login' })
    };
  }

  try {
    const { question } = JSON.parse(event.body);

    if (!question) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Question is required' })
      };
    }

    // Check if API key is set
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'API key not configured. Please set ANTHROPIC_API_KEY environment variable.' 
        })
      };
    }

    // Initialize Anthropic client with API key from environment variable
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a helpful school AI tutor for ${session.username}. Answer this student's question clearly and concisely: ${question}`
      }]
    });

    // Extract the answer from Claude's response
    const answer = message.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get AI response. Please try again.' 
      })
    };
  }
};
