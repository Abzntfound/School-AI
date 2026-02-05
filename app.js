// Check if user is already logged in
window.addEventListener('DOMContentLoaded', function() {
  const sessionToken = sessionStorage.getItem('sessionToken');
  const username = sessionStorage.getItem('username');
  
  if (sessionToken && username) {
    showApp(username);
  }

  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Login form listeners
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  
  usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      login();
    }
  });

  loginBtn.addEventListener('click', login);

  // App listeners
  const questionInput = document.getElementById('question');
  const askBtn = document.getElementById('askBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  questionInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      askAI();
    }
  });

  askBtn.addEventListener('click', askAI);
  logoutBtn.addEventListener('click', logout);
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const messageDiv = document.getElementById('loginMessage');
  const button = document.getElementById('loginBtn');

  if (!username || !password) {
    messageDiv.innerHTML = '<div class="error">Please enter both username and password</div>';
    return;
  }

  button.disabled = true;
  button.textContent = 'Logging in...';
  messageDiv.innerHTML = '';

  try {
    const response = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Store session
      sessionStorage.setItem('sessionToken', data.token);
      sessionStorage.setItem('username', username);
      
      messageDiv.innerHTML = '<div class="success">Login successful!</div>';
      
      setTimeout(() => {
        showApp(username);
      }, 500);
    } else {
      console.error('Login failed:', data);
      let errorMsg = data.error || 'Login failed';
      if (data.debug) {
        errorMsg += `<br><small>${data.debug}</small>`;
      }
      messageDiv.innerHTML = `<div class="error">${errorMsg}<br><br>Try:<br>Username: <strong>admin</strong><br>Password: <strong>admin123</strong></div>`;
    }
  } catch (error) {
    console.error('Login error:', error);
    messageDiv.innerHTML = '<div class="error">Connection error. Check console (F12) and see CREDENTIALS.md</div>';
  } finally {
    button.disabled = false;
    button.textContent = 'Login';
  }
}

function showApp(username) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('userInfo').textContent = `Welcome, ${username}! 👋`;
}

function logout() {
  sessionStorage.removeItem('sessionToken');
  sessionStorage.removeItem('username');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('question').value = '';
  document.getElementById('answerContainer').classList.remove('show');
  document.getElementById('loginMessage').innerHTML = '';
}

async function askAI() {
  const question = document.getElementById('question').value.trim();
  const answerContainer = document.getElementById('answerContainer');
  const answerElement = document.getElementById('answer');
  const button = document.getElementById('askBtn');
  const sessionToken = sessionStorage.getItem('sessionToken');

  if (!sessionToken) {
    logout();
    return;
  }

  if (!question) {
    answerElement.innerHTML = '<div class="error">Please enter a question!</div>';
    answerContainer.classList.add('show');
    return;
  }

  button.disabled = true;
  button.textContent = 'Thinking...';
  answerContainer.classList.add('show');
  answerElement.innerHTML = '<div class="loading">AI is thinking</div>';

  try {
    const response = await fetch('/.netlify/functions/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ question })
    });

    const data = await response.json();

    if (response.status === 401) {
      answerElement.innerHTML = '<div class="error">Session expired. Please login again.</div>';
      setTimeout(logout, 2000);
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    answerElement.textContent = data.answer;
  } catch (error) {
    console.error('AI error:', error);
    answerElement.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = 'Ask AI';
  }
}
