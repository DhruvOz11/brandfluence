const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('../models/User');
const Collaboration = require('../models/Collaboration');
const ChatMessage = require('../models/ChatMessage');
const ChatReport = require('../models/ChatReport');
const chatRoutes = require('../routes/chatRoutes');

process.env.JWT_SECRET = 'test-secret';

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', chatRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return server;
};

const createToken = (userId, role) => jwt.sign({
  userId,
  role,
  tokenVersion: 0
}, process.env.JWT_SECRET);

const setAuthenticatedUser = (userId, role) => {
  User.findById = id => ({
    select: async () => ({
      _id: id,
      role,
      name: role === 'creator' ? 'Creator' : 'Brand',
      image: role === 'creator' ? 'uploads/creator.png' : 'uploads/brand.png',
      tokenVersion: 0
    })
  });
};

const postJson = async (server, path, userId, role, body) => {
  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}/api/chat${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${createToken(userId, role)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};

const closeServer = server => new Promise((resolve, reject) => {
  server.close(error => (error ? reject(error) : resolve()));
});

const createQuery = result => ({
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  select() {
    return this;
  },
  limit() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(result).then(resolve, reject);
  }
});

test('conversation inbox includes partner details, unread count, and block state', async () => {
  const originalFindById = User.findById;
  const originalCollaborationFind = Collaboration.find;
  const originalMessageFindOne = ChatMessage.findOne;
  const originalCountDocuments = ChatMessage.countDocuments;
  const creatorId = '507f1f77bcf86cd799439011';
  const brandId = '507f1f77bcf86cd799439012';
  const collaborationId = '507f1f77bcf86cd799439013';
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.find = () => createQuery([{
    _id: collaborationId,
    title: 'Launch campaign',
    status: 'In Progress',
    creatorId,
    brandId: { _id: brandId, name: 'Brand', image: 'uploads/brand.png' },
    chatBlocks: { brandBlockedAt: null, creatorBlockedAt: null }
  }]);
  ChatMessage.findOne = () => createQuery({
    body: 'Reviewing the draft',
    senderId: brandId,
    createdAt: new Date('2026-01-01T10:00:00.000Z')
  });
  ChatMessage.countDocuments = async () => 2;
  const server = await startTestServer();

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/chat/conversations`,
      { headers: { Authorization: `Bearer ${createToken(creatorId, 'creator')}` } }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.conversations[0].partner.name, 'Brand');
    assert.equal(body.conversations[0].partner.image, 'uploads/brand.png');
    assert.equal(body.conversations[0].unreadCount, 2);
    assert.equal(body.conversations[0].lastMessage.body, 'Reviewing the draft');
    assert.equal(body.conversations[0].lastMessage.isMine, false);
  } finally {
    User.findById = originalFindById;
    Collaboration.find = originalCollaborationFind;
    ChatMessage.findOne = originalMessageFindOne;
    ChatMessage.countDocuments = originalCountDocuments;
    await closeServer(server);
  }
});

test('opening a conversation marks its unread messages as read', async () => {
  const originalFindById = User.findById;
  const originalCollaborationFindOne = Collaboration.findOne;
  const originalMessageFind = ChatMessage.find;
  const originalUpdateMany = ChatMessage.updateMany;
  const creatorId = '507f1f77bcf86cd799439011';
  const brandId = '507f1f77bcf86cd799439012';
  const collaborationId = '507f1f77bcf86cd799439013';
  const messageId = '507f1f77bcf86cd799439014';
  let readFilter;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOne = async () => ({
    _id: collaborationId,
    creatorId,
    brandId,
    chatBlocks: {}
  });
  ChatMessage.find = () => createQuery([{
    _id: messageId,
    senderId: { _id: brandId, name: 'Brand', image: 'uploads/brand.png' },
    recipientId: creatorId,
    body: 'A new message',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    readAt: null
  }]);
  ChatMessage.updateMany = async filter => {
    readFilter = filter;
  };
  const server = await startTestServer();

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/chat/conversations/${collaborationId}/messages`,
      { headers: { Authorization: `Bearer ${createToken(creatorId, 'creator')}` } }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.messages[0].isMine, false);
    assert.equal(body.messages[0].senderImage, 'uploads/brand.png');
    assert.deepEqual(readFilter, {
      collaborationId,
      recipientId: creatorId,
      readAt: null
    });
  } finally {
    User.findById = originalFindById;
    Collaboration.findOne = originalCollaborationFindOne;
    ChatMessage.find = originalMessageFind;
    ChatMessage.updateMany = originalUpdateMany;
    await closeServer(server);
  }
});

test('message endpoint hides conversations from non-participants', async () => {
  const originalFindById = User.findById;
  const originalFindOne = Collaboration.findOne;
  const creatorId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439012';
  let conversationFilter;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOne = async filter => {
    conversationFilter = filter;
    return null;
  };
  const server = await startTestServer();

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/chat/conversations/${collaborationId}/messages`,
      { headers: { Authorization: `Bearer ${createToken(creatorId, 'creator')}` } }
    );

    assert.equal(response.status, 404);
    assert.deepEqual(conversationFilter, { _id: collaborationId, creatorId });
  } finally {
    User.findById = originalFindById;
    Collaboration.findOne = originalFindOne;
    await closeServer(server);
  }
});

test('message sending is rejected when either participant has blocked the chat', async () => {
  const originalFindById = User.findById;
  const originalFindOne = Collaboration.findOne;
  const originalSave = ChatMessage.prototype.save;
  const creatorId = '507f1f77bcf86cd799439011';
  const brandId = '507f1f77bcf86cd799439012';
  const collaborationId = '507f1f77bcf86cd799439013';
  let messageSaved = false;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOne = async () => ({
    _id: collaborationId,
    brandId,
    creatorId,
    chatBlocks: { brandBlockedAt: new Date(), creatorBlockedAt: null }
  });
  ChatMessage.prototype.save = async function saveMessage() {
    messageSaved = true;
  };
  const server = await startTestServer();

  try {
    const response = await postJson(
      server,
      `/conversations/${collaborationId}/messages`,
      creatorId,
      'creator',
      { body: 'Hello there' }
    );

    assert.equal(response.status, 423);
    assert.equal(messageSaved, false);
  } finally {
    User.findById = originalFindById;
    Collaboration.findOne = originalFindOne;
    ChatMessage.prototype.save = originalSave;
    await closeServer(server);
  }
});

test('valid text is trimmed and addressed to the other campaign participant', async () => {
  const originalFindById = User.findById;
  const originalFindOne = Collaboration.findOne;
  const originalSave = ChatMessage.prototype.save;
  const creatorId = '507f1f77bcf86cd799439011';
  const brandId = '507f1f77bcf86cd799439012';
  const collaborationId = '507f1f77bcf86cd799439013';
  let savedMessage;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOne = async () => ({
    _id: collaborationId,
    brandId,
    creatorId,
    chatBlocks: {}
  });
  ChatMessage.prototype.save = async function saveMessage() {
    savedMessage = this;
    return this;
  };
  const server = await startTestServer();

  try {
    const response = await postJson(
      server,
      `/conversations/${collaborationId}/messages`,
      creatorId,
      'creator',
      { body: '  Hello about the campaign  ' }
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(savedMessage.body, 'Hello about the campaign');
    assert.equal(String(savedMessage.senderId), creatorId);
    assert.equal(String(savedMessage.recipientId), brandId);
    assert.equal(body.message.isMine, true);
    assert.equal(body.message.senderImage, 'uploads/creator.png');
  } finally {
    User.findById = originalFindById;
    Collaboration.findOne = originalFindOne;
    ChatMessage.prototype.save = originalSave;
    await closeServer(server);
  }
});

test('block state is scoped to the participant requesting it', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = Collaboration.findOneAndUpdate;
  const creatorId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439013';
  let updateFilter;
  let updateValues;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return Promise.resolve({
      chatBlocks: { creatorBlockedAt: new Date(), brandBlockedAt: null }
    });
  };
  const server = await startTestServer();

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/chat/conversations/${collaborationId}/block`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${createToken(creatorId, 'creator')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blocked: true })
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, { _id: collaborationId, creatorId });
    assert.ok(updateValues.$set['chatBlocks.creatorBlockedAt'] instanceof Date);
    assert.deepEqual(body.blockState, { youBlocked: true, otherBlocked: false });
  } finally {
    User.findById = originalFindById;
    Collaboration.findOneAndUpdate = originalFindOneAndUpdate;
    await closeServer(server);
  }
});

test('reports derive the reported participant from the campaign, not request data', async () => {
  const originalFindById = User.findById;
  const originalFindOne = Collaboration.findOne;
  const originalMessageFindOne = ChatMessage.findOne;
  const originalReportSave = ChatReport.prototype.save;
  const creatorId = '507f1f77bcf86cd799439011';
  const brandId = '507f1f77bcf86cd799439012';
  const collaborationId = '507f1f77bcf86cd799439013';
  let savedReport;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOne = async () => ({ _id: collaborationId, creatorId, brandId });
  ChatMessage.findOne = async () => null;
  ChatReport.prototype.save = async function saveReport() {
    savedReport = this;
    return this;
  };
  const server = await startTestServer();

  try {
    const response = await postJson(
      server,
      `/conversations/${collaborationId}/reports`,
      creatorId,
      'creator',
      {
        reason: 'The other participant sent repeated unwanted messages.',
        reportedUserId: creatorId
      }
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(String(savedReport.reporterId), creatorId);
    assert.equal(String(savedReport.reportedUserId), brandId);
    assert.equal(body.message, 'Report submitted for review');
  } finally {
    User.findById = originalFindById;
    Collaboration.findOne = originalFindOne;
    ChatMessage.findOne = originalMessageFindOne;
    ChatReport.prototype.save = originalReportSave;
    await closeServer(server);
  }
});
