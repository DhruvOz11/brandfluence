const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

process.env.JWT_SECRET = 'test-secret';

const createRequest = token => ({
  header: name => name === 'Authorization' && token ? `Bearer ${token}` : undefined
});

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const createToken = payload => jwt.sign(payload, process.env.JWT_SECRET);

test('requires a bearer token', async () => {
  const res = createResponse();
  let nextCalled = false;

  await auth(['creator'])(createRequest(null), res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('does not allow an admin token through a creator-only gate', async () => {
  const res = createResponse();
  let nextCalled = false;

  await auth(['creator'])(
    createRequest(createToken({ userId: 'admin', role: 'admin', isAdmin: true })),
    res,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('allows an admin token through an admin-only gate', async () => {
  const res = createResponse();
  let nextCalled = false;

  await auth(['admin'])(
    createRequest(createToken({ userId: 'admin', role: 'admin', isAdmin: true })),
    res,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('loads the authenticated user and allows their matching role', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({
      _id: '507f1f77bcf86cd799439011',
      role: 'creator',
      name: 'Creator',
      tokenVersion: 0
    })
  });

  try {
    const res = createResponse();
    let nextCalled = false;

    await auth(['creator'])(
      createRequest(createToken({
        userId: '507f1f77bcf86cd799439011',
        role: 'creator',
        tokenVersion: 0
      })),
      res,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  } finally {
    User.findById = originalFindById;
  }
});

test('rejects sessions issued before a password reset', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({
      _id: '507f1f77bcf86cd799439011',
      role: 'creator',
      name: 'Creator',
      tokenVersion: 1
    })
  });

  try {
    const res = createResponse();
    let nextCalled = false;

    await auth(['creator'])(
      createRequest(createToken({
        userId: '507f1f77bcf86cd799439011',
        role: 'creator',
        tokenVersion: 0
      })),
      res,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  } finally {
    User.findById = originalFindById;
  }
});

test('blocks suspended accounts from authenticated routes', async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({
      _id: '507f1f77bcf86cd799439011',
      role: 'creator',
      name: 'Creator',
      tokenVersion: 0,
      isSuspended: true,
      suspensionReason: 'Repeated policy violations'
    })
  });

  try {
    const res = createResponse();
    let nextCalled = false;

    await auth(['creator'])(
      createRequest(createToken({
        userId: '507f1f77bcf86cd799439011',
        role: 'creator',
        tokenVersion: 0
      })),
      res,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /suspended/i);
    assert.equal(nextCalled, false);
  } finally {
    User.findById = originalFindById;
  }
});
