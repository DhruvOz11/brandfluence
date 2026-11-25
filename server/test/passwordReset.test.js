const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');
process.env.JWT_SECRET = 'test-secret';
const SMTP_ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM'
];

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return server;
};

test('login rejects a missing password without calling bcrypt', async () => {
  const originalFindOne = User.findOne;
  let userLookupCalled = false;
  User.findOne = () => {
    userLookupCalled = true;
    throw new Error('A missing password should be rejected before lookup');
  };
  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login/creator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'creator@example.com' })
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'Enter your email and password');
    assert.equal(userLookupCalled, false);
  } finally {
    User.findOne = originalFindOne;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('login handles a legacy account without a stored password hash safely', async () => {
  const originalFindOne = User.findOne;
  const originalConsoleError = console.error;
  User.findOne = () => ({
    select: async () => ({
      _id: '507f1f77bcf86cd799439011',
      name: 'Creator',
      email: 'creator@example.com',
      role: 'creator'
    })
  });
  console.error = () => {};
  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login/creator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'creator@example.com',
        password: 'some-password'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.match(body.error, /invalid email or password/i);
    assert.doesNotMatch(body.error, /illegal arguments|undefined/i);
  } finally {
    User.findOne = originalFindOne;
    console.error = originalConsoleError;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('login explicitly selects the password hash and accepts a valid password', async () => {
  const originalFindOne = User.findOne;
  const passwordHash = await bcrypt.hash('correct-password', 4);
  let selectedFields;
  User.findOne = () => ({
    select: async fields => {
      selectedFields = fields;
      return {
        _id: '507f1f77bcf86cd799439011',
        name: 'Creator',
        email: 'creator@example.com',
        role: 'creator',
        password: passwordHash,
        tokenVersion: 0,
        isSuspended: false
      };
    }
  });
  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login/creator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'creator@example.com',
        password: 'correct-password'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(selectedFields, /(^|\s)name(\s|$)/);
    assert.match(selectedFields, /(^|\s)email(\s|$)/);
    assert.match(selectedFields, /(^|\s)role(\s|$)/);
    assert.match(selectedFields, /(^|\s)password(\s|$)/);
    assert.match(selectedFields, /\+tokenVersion/);
    assert.equal(body.user.name, 'Creator');
    assert.equal(body.user.email, 'creator@example.com');
    assert.equal(body.user.role, 'creator');
    assert.ok(body.token);
  } finally {
    User.findOne = originalFindOne;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('reset token changes the password once and invalidates old sessions', async () => {
  const originalFindOne = User.findOne;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expectedTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = {
    password: 'old-password-hash',
    passwordResetTokenHash: expectedTokenHash,
    passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
    tokenVersion: 0,
    save: async () => {}
  };
  let resetQuery;
  let resetTokenWasUsed = false;

  User.findOne = query => {
    resetQuery = query;
    return {
      select: async () => {
        if (resetTokenWasUsed) return null;
        resetTokenWasUsed = true;
        return user;
      }
    };
  };

  const server = await startTestServer();
  const address = server.address();
  const resetUrl = `http://127.0.0.1:${address.port}/api/auth/password/reset`;

  try {
    const firstResponse = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'new-password-123' })
    });
    const firstBody = await firstResponse.json();

    assert.equal(firstResponse.status, 200);
    assert.equal(firstBody.message, 'Password reset successfully. Please sign in.');
    assert.equal(resetQuery.passwordResetTokenHash, expectedTokenHash);
    assert.equal(user.tokenVersion, 1);
    assert.equal(user.passwordResetTokenHash, undefined);
    assert.equal(await bcrypt.compare('new-password-123', user.password), true);

    const secondResponse = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'another-password-123' })
    });

    assert.equal(secondResponse.status, 400);
    assert.equal(user.tokenVersion, 1);
  } finally {
    User.findOne = originalFindOne;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('suspended creator cannot obtain a new login session', async () => {
  const originalFindOne = User.findOne;
  const passwordHash = await bcrypt.hash('correct-password', 4);
  User.findOne = () => ({
    select: async () => ({
      _id: '507f1f77bcf86cd799439011',
      role: 'creator',
      password: passwordHash,
      tokenVersion: 0,
      isSuspended: true,
      suspensionReason: 'Repeated policy violations'
    })
  });
  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login/creator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'creator@example.com',
        password: 'correct-password'
      })
    });

    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /suspended/i);
  } finally {
    User.findOne = originalFindOne;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('forgot-password does not disclose unknown email addresses', async () => {
  const originalFindOne = User.findOne;
  const originalEnv = Object.fromEntries(SMTP_ENV_KEYS.map(key => [key, process.env[key]]));
  SMTP_ENV_KEYS.forEach(key => {
    process.env[key] = `test-${key.toLowerCase()}`;
  });
  User.findOne = () => ({ select: async () => null });

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@example.com' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(body.message, /if an account exists/i);
    assert.equal(JSON.stringify(body).includes('unknown@example.com'), false);
  } finally {
    User.findOne = originalFindOne;
    SMTP_ENV_KEYS.forEach(key => {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    });
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('forgot-password reports missing email configuration', async () => {
  const originalFindOne = User.findOne;
  const originalEnv = Object.fromEntries(SMTP_ENV_KEYS.map(key => [key, process.env[key]]));
  SMTP_ENV_KEYS.forEach(key => delete process.env[key]);
  User.findOne = () => {
    throw new Error('User lookup should not run without email configuration');
  };

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@example.com' })
    });
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error, 'Password reset email is not configured');
  } finally {
    User.findOne = originalFindOne;
    SMTP_ENV_KEYS.forEach(key => {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    });
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});
