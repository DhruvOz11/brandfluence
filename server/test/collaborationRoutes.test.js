const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('../models/User');
const Collaboration = require('../models/Collaboration');
const collaborationRoutes = require('../routes/collaborationRoutes');

process.env.JWT_SECRET = 'test-secret';

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/collaborations', collaborationRoutes);
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
    select: async () => ({ _id: id, role, tokenVersion: 0 })
  });
};

const requestStatus = async (server, userId, role, collaborationId, body) => {
  const address = server.address();
  return fetch(
    `http://127.0.0.1:${address.port}/api/collaborations/${collaborationId}/status`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${createToken(userId, role)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
};

const closeServer = server => new Promise((resolve, reject) => {
  server.close(error => (error ? reject(error) : resolve()));
});

const createPopulateQuery = result => ({
  populate() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(result).then(resolve, reject);
  }
});

test('campaign submission rejects an invalid note before attempting a database update', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = Collaboration.findOneAndUpdate;
  const creatorId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439012';
  let updateCalled = false;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOneAndUpdate = () => {
    updateCalled = true;
    throw new Error('Invalid note must be rejected before the update');
  };
  const server = await startTestServer();

  try {
    const response = await requestStatus(
      server,
      creatorId,
      'creator',
      collaborationId,
      { status: 'Submitted', submissionNote: { unexpected: true } }
    );

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /short note|submission note/i);
    assert.equal(updateCalled, false);
  } finally {
    User.findById = originalFindById;
    Collaboration.findOneAndUpdate = originalFindOneAndUpdate;
    await closeServer(server);
  }
});

test('creator status transition is scoped to the creator and expected campaign status', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = Collaboration.findOneAndUpdate;
  const creatorId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439012';
  let updateFilter;
  let updateValues;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    const query = {
      populate() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve({
          _id: collaborationId,
          status: 'Submitted',
          submissionNote: 'Published the agreed campaign content'
        }).then(resolve, reject);
      }
    };
    return query;
  };
  const server = await startTestServer();

  try {
    const response = await requestStatus(
      server,
      creatorId,
      'creator',
      collaborationId,
      {
        status: 'Submitted',
        submissionNote: '  Published the agreed campaign content  '
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, {
      _id: collaborationId,
      creatorId,
      status: 'In Progress'
    });
    assert.equal(updateValues.$set.status, 'Submitted');
    assert.equal(updateValues.$set.submissionNote, 'Published the agreed campaign content');
    assert.equal(updateValues.$push.statusHistory.note, 'Published the agreed campaign content');
    assert.equal(body.collaboration.status, 'Submitted');
  } finally {
    User.findById = originalFindById;
    Collaboration.findOneAndUpdate = originalFindOneAndUpdate;
    await closeServer(server);
  }
});

test('creator cannot perform a brand-only or unknown campaign transition', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = Collaboration.findOneAndUpdate;
  const creatorId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439012';
  let updateCalled = false;
  setAuthenticatedUser(creatorId, 'creator');
  Collaboration.findOneAndUpdate = () => {
    updateCalled = true;
    throw new Error('Unauthorized transition must not update a campaign');
  };
  const server = await startTestServer();

  try {
    const response = await requestStatus(
      server,
      creatorId,
      'creator',
      collaborationId,
      { status: 'Completed' }
    );

    assert.equal(response.status, 400);
    const invalidStatusResponse = await requestStatus(
      server,
      creatorId,
      'creator',
      collaborationId,
      { status: 'toString' }
    );
    assert.equal(invalidStatusResponse.status, 400);
    assert.equal(updateCalled, false);
  } finally {
    User.findById = originalFindById;
    Collaboration.findOneAndUpdate = originalFindOneAndUpdate;
    await closeServer(server);
  }
});

test('brand can start an accepted campaign only when it owns the campaign', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = Collaboration.findOneAndUpdate;
  const brandId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439012';
  let updateFilter;
  let updateValues;
  setAuthenticatedUser(brandId, 'brand');
  Collaboration.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return createPopulateQuery({ _id: collaborationId, status: 'In Progress' });
  };
  const server = await startTestServer();

  try {
    const response = await requestStatus(
      server,
      brandId,
      'brand',
      collaborationId,
      { status: 'In Progress' }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, {
      _id: collaborationId,
      brandId,
      status: 'Accepted'
    });
    assert.equal(updateValues.$set.status, 'In Progress');
  } finally {
    User.findById = originalFindById;
    Collaboration.findOneAndUpdate = originalFindOneAndUpdate;
    await closeServer(server);
  }
});

test('stale campaign transition returns a conflict instead of reporting success', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = Collaboration.findOneAndUpdate;
  const brandId = '507f1f77bcf86cd799439011';
  const collaborationId = '507f1f77bcf86cd799439012';
  setAuthenticatedUser(brandId, 'brand');
  Collaboration.findOneAndUpdate = () => createPopulateQuery(null);
  const server = await startTestServer();

  try {
    const response = await requestStatus(
      server,
      brandId,
      'brand',
      collaborationId,
      { status: 'Completed' }
    );

    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /already changed/i);
  } finally {
    User.findById = originalFindById;
    Collaboration.findOneAndUpdate = originalFindOneAndUpdate;
    await closeServer(server);
  }
});

test('campaign request rejects an incomplete brief before looking up the creator', async () => {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const brandId = '507f1f77bcf86cd799439011';
  let creatorLookupCalled = false;
  setAuthenticatedUser(brandId, 'brand');
  User.findOne = () => {
    creatorLookupCalled = true;
    throw new Error('Invalid brief must not look up a creator');
  };
  const server = await startTestServer();

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/collaborations/request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${createToken(brandId, 'brand')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        creatorId: '507f1f77bcf86cd799439012',
        title: 'Launch campaign',
        purpose: 'A sufficiently detailed campaign brief',
        deliverables: 'one short video',
        budget: 200
      })
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /due date/i);
    assert.equal(creatorLookupCalled, false);
  } finally {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    await closeServer(server);
  }
});
