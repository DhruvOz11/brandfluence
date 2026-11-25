const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('../models/User');
const ChatReport = require('../models/ChatReport');
const ModerationAction = require('../models/ModerationAction');
const adminRoutes = require('../routes/adminRoutes');

process.env.JWT_SECRET = 'test-secret';

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return server;
};

const adminToken = () => jwt.sign({
  userId: 'admin',
  role: 'admin',
  isAdmin: true
}, process.env.JWT_SECRET);

const requestJson = async (server, path, method, body, token = adminToken()) => {
  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}/api/admin${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
};

const createSelectQuery = result => ({
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(result).then(resolve, reject);
  }
});

const closeServer = server => new Promise((resolve, reject) => {
  server.close(error => (error ? reject(error) : resolve()));
});

test('admin account list includes account profile images', async () => {
  const originalFind = User.find;
  const imagePath = 'uploads/company-logo.png';
  let selectedFields;
  User.find = () => {
    const query = {
      select(fields) {
        selectedFields = fields;
        return query;
      },
      sort() {
        return query;
      },
      limit() {
        return Promise.resolve([{
          _id: '507f1f77bcf86cd799439011',
          name: 'Brand',
          role: 'brand',
          image: imagePath
        }]);
      }
    };
    return query;
  };
  const server = await startTestServer();

  try {
    const response = await requestJson(server, '/users', 'GET');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(selectedFields, /(^|\s)image(\s|$)/);
    assert.equal(body.users[0].image, imagePath);
  } finally {
    User.find = originalFind;
    await closeServer(server);
  }
});

test('moderation endpoints reject non-admin sessions', async () => {
  const originalFindById = User.findById;
  User.findById = id => ({
    select: async () => ({ _id: id, role: 'creator', tokenVersion: 0 })
  });
  const server = await startTestServer();

  try {
    const response = await requestJson(
      server,
      '/verification-requests',
      'GET',
      undefined,
      jwt.sign({
        userId: '507f1f77bcf86cd799439011',
        role: 'creator',
        tokenVersion: 0
      }, process.env.JWT_SECRET)
    );

    assert.equal(response.status, 403);
  } finally {
    User.findById = originalFindById;
    await closeServer(server);
  }
});

test('verification approval only updates a pending creator and records the reason', async () => {
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const originalActionSave = ModerationAction.prototype.save;
  const creatorId = '507f1f77bcf86cd799439011';
  let updateFilter;
  let updateValues;
  let savedAction;
  User.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return createSelectQuery({
      _id: creatorId,
      name: 'Creator',
      verificationStatus: 'Approved',
      isVerified: true
    });
  };
  ModerationAction.prototype.save = async function saveAction() {
    savedAction = this;
    return this;
  };
  const server = await startTestServer();

  try {
    const response = await requestJson(
      server,
      `/verification-requests/${creatorId}`,
      'PUT',
      { decision: 'Approved', reason: 'Public profile and account details match.' }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, {
      _id: creatorId,
      role: 'creator',
      verificationStatus: 'Pending'
    });
    assert.equal(updateValues.$set.isVerified, true);
    assert.equal(updateValues.$set.verificationDecisionReason, 'Public profile and account details match.');
    assert.equal(savedAction.action, 'verification_approved');
    assert.equal(String(savedAction.subjectId), creatorId);
    assert.equal(body.creator.verificationStatus, 'Approved');
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
    ModerationAction.prototype.save = originalActionSave;
    await closeServer(server);
  }
});

test('account suspension requires a reason and increments token version', async () => {
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const originalActionSave = ModerationAction.prototype.save;
  const userId = '507f1f77bcf86cd799439011';
  let updateFilter;
  let updateValues;
  let actionSaved = false;
  User.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return createSelectQuery({
      _id: userId,
      name: 'Brand',
      role: 'brand',
      isSuspended: true,
      suspensionReason: 'Repeated policy violations'
    });
  };
  ModerationAction.prototype.save = async function saveAction() {
    actionSaved = true;
    return this;
  };
  const server = await startTestServer();

  try {
    const invalidResponse = await requestJson(
      server,
      `/users/${userId}/suspension`,
      'PUT',
      { suspended: true, reason: 'Too short' }
    );
    assert.equal(invalidResponse.status, 400);
    assert.equal(actionSaved, false);

    const response = await requestJson(
      server,
      `/users/${userId}/suspension`,
      'PUT',
      { suspended: true, reason: 'Repeated policy violations' }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, {
      _id: userId,
      role: { $in: ['creator', 'brand'] }
    });
    assert.equal(updateValues.$inc.tokenVersion, 1);
    assert.equal(updateValues.$set.isSuspended, true);
    assert.equal(actionSaved, true);
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
    ModerationAction.prototype.save = originalActionSave;
    await closeServer(server);
  }
});

test('chat report review accepts only an open report and records the decision', async () => {
  const originalFindOneAndUpdate = ChatReport.findOneAndUpdate;
  const originalActionSave = ModerationAction.prototype.save;
  const reportId = '507f1f77bcf86cd799439011';
  let updateFilter;
  let updateValues;
  let savedAction;
  ChatReport.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return Promise.resolve({ _id: reportId, status: 'Reviewed' });
  };
  ModerationAction.prototype.save = async function saveAction() {
    savedAction = this;
    return this;
  };
  const server = await startTestServer();

  try {
    const response = await requestJson(
      server,
      `/chat-reports/${reportId}`,
      'PUT',
      { status: 'Reviewed', reason: 'Reviewed and documented for follow-up.' }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, { _id: reportId, status: 'Open' });
    assert.deepEqual(updateValues, { $set: { status: 'Reviewed' } });
    assert.equal(savedAction.action, 'chat_report_reviewed');
    assert.equal(String(savedAction.subjectId), reportId);
  } finally {
    ChatReport.findOneAndUpdate = originalFindOneAndUpdate;
    ModerationAction.prototype.save = originalActionSave;
    await closeServer(server);
  }
});
