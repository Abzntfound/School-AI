const Anthropic = require('@anthropic-ai/sdk');

// Simple session store (shared across function invocations in same instance)
// In production, use Redis or a database
const sessions = new Map();

// Verify session token
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify authentication
  const session = verifyToken(event.headers.authorization);
  
  if (!session) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized - Please login' })
    };
  }

  try {
    const { question } = JSON.parse(event.body);

    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Question is required' })
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answer })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to get AI response. Make sure your API key is set up correctly.' 
      })
    };
  }
};

// Share sessions Map with auth function
exports.sessions = sessions;
