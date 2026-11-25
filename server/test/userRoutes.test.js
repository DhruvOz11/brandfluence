const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('../models/User');
const userRoutes = require('../routes/userRoutes');
const { removePortfolioFile } = require('../utils/portfolioUpload');

process.env.JWT_SECRET = 'test-secret';

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return server;
};

const createToken = (userId, role) => jwt.sign({
  userId,
  role,
  tokenVersion: 0
}, process.env.JWT_SECRET);

test('brand profile response contains public profile and portfolio fields only', async () => {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const brandId = '507f1f77bcf86cd799439011';
  const creatorId = '507f1f77bcf86cd799439012';
  let lookupFilter;
  let projection;

  User.findById = id => ({
    select: async () => ({ _id: id, role: 'brand', tokenVersion: 0 })
  });
  User.findOne = filter => {
    lookupFilter = filter;
    return {
      select: async fields => {
        projection = fields;
        return {
          _id: creatorId,
          name: 'Creator',
          description: 'Portfolio creator',
          portfolio: [{ filename: 'sample.jpg', mediaType: 'image' }]
        };
      }
    };
  };

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/users/creators/${creatorId}`,
      { headers: { Authorization: `Bearer ${createToken(brandId, 'brand')}` } }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(lookupFilter, {
      _id: creatorId,
      role: 'creator',
      isSuspended: { $ne: true }
    });
    assert.match(projection, /portfolio/);
    assert.doesNotMatch(projection, /password|email|tokenVersion/);
    assert.doesNotMatch(projection, /verificationEvidence|verificationDecisionReason/);
    assert.equal(body.name, 'Creator');
    assert.equal(body.portfolio.length, 1);
    assert.equal('password' in body, false);
    assert.equal('email' in body, false);
  } finally {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('creator cannot view another creator profile through the brand endpoint', async () => {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const creatorId = '507f1f77bcf86cd799439011';
  let profileLookupCalled = false;

  User.findById = id => ({
    select: async () => ({ _id: id, role: 'creator', tokenVersion: 0 })
  });
  User.findOne = () => {
    profileLookupCalled = true;
    throw new Error('Creator-only user should be rejected before profile lookup');
  };

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/users/creators/507f1f77bcf86cd799439012`,
      { headers: { Authorization: `Bearer ${createToken(creatorId, 'creator')}` } }
    );

    assert.equal(response.status, 403);
    assert.equal(profileLookupCalled, false);
  } finally {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('creator profile updates are scoped to the authenticated creator', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const creatorId = '507f1f77bcf86cd799439011';
  let updateFilter;
  let updateValues;

  User.findById = id => ({
    select: async () => ({ _id: id, role: 'creator', tokenVersion: 0 })
  });
  User.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return {
      select: async () => ({
        _id: creatorId,
        name: 'Updated Creator',
        role: 'creator',
        description: 'A new bio',
        charges: 125,
        followers: 1000
      })
    };
  };

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/users/creators/me/profile`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${createToken(creatorId, 'creator')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Creator',
          description: 'A new bio',
          city: 'Pune',
          category: 'Food',
          charges: 125,
          followers: 1000,
          instagramProfile: ''
        })
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, { _id: creatorId, role: 'creator' });
    assert.equal(updateValues.$set.followers, 1000);
    assert.equal(body.name, 'Updated Creator');
    assert.equal('password' in body, false);
  } finally {
    User.findById = originalFindById;
    User.findOneAndUpdate = originalFindOneAndUpdate;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('creator search applies category, partial city, rate, and follower filters', async () => {
  const originalFindById = User.findById;
  const originalFind = User.find;
  const brandId = '507f1f77bcf86cd799439011';
  let searchFilter;

  User.findById = id => ({
    select: async () => ({ _id: id, role: 'brand', tokenVersion: 0 })
  });
  User.find = filter => {
    searchFilter = filter;
    return {
      select: async () => []
    };
  };

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/users/creators?category=Food&city=New%20York&maxRate=500&minFollowers=1000`,
      { headers: { Authorization: `Bearer ${createToken(brandId, 'brand')}` } }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(searchFilter, {
      role: 'creator',
      isSuspended: { $ne: true },
      category: 'Food',
      city: { $regex: 'New York', $options: 'i' },
      charges: { $lte: 500 },
      followers: { $gte: 1000 }
    });
  } finally {
    User.findById = originalFindById;
    User.find = originalFind;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('creator verification request validates and stores public evidence', async () => {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const creatorId = '507f1f77bcf86cd799439011';
  let updateFilter;
  let updateValues;

  User.findById = id => ({
    select: async () => ({ _id: id, role: 'creator', tokenVersion: 0 })
  });
  User.findOneAndUpdate = (filter, update) => {
    updateFilter = filter;
    updateValues = update;
    return {
      select: async () => ({
        _id: creatorId,
        name: 'Creator',
        isVerified: false,
        verificationStatus: 'Pending',
        verificationEvidence: 'Public profile: https://example.com/creator'
      })
    };
  };

  const server = await startTestServer();
  const address = server.address();

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/users/creators/me/verification-request`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createToken(creatorId, 'creator')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          evidence: '  Public profile: https://example.com/creator  '
        })
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(updateFilter, {
      _id: creatorId,
      role: 'creator',
      isVerified: { $ne: true },
      verificationStatus: { $ne: 'Pending' }
    });
    assert.equal(updateValues.$set.verificationStatus, 'Pending');
    assert.equal(updateValues.$set.verificationEvidence, 'Public profile: https://example.com/creator');
    assert.equal(body.verificationStatus, 'Pending');
  } finally {
    User.findById = originalFindById;
    User.findOneAndUpdate = originalFindOneAndUpdate;
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

test('creators and brands can upload a valid profile image', async () => {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const creatorId = '507f1f77bcf86cd799439011';
  const brandId = '507f1f77bcf86cd799439012';
  const uploadedImages = [];
  let currentRole;
  let profileFilter;
  let profileLookupCount = 0;

  User.findById = id => ({
    select: async () => ({ _id: id, role: currentRole, tokenVersion: 0 })
  });
  User.findOne = filter => {
    profileFilter = filter;
    profileLookupCount += 1;
    const user = {
      _id: filter._id,
      name: currentRole === 'creator' ? 'Creator' : 'Brand',
      role: currentRole,
      image: '/default-avatar.png',
      save: async () => {}
    };
    return { select: async () => user };
  };

  const server = await startTestServer();
  const address = server.address();
  const validPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

  try {
    for (const [role, userId] of [['creator', creatorId], ['brand', brandId]]) {
      currentRole = role;
      const form = new FormData();
      form.append('image', new Blob([validPng], { type: 'image/png' }), `${role}.png`);

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/users/me/profile-image`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${createToken(userId, role)}` },
          body: form
        }
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(profileFilter, { _id: userId, role });
      assert.equal(body.role, role);
      assert.match(body.image, /^uploads\/.+\.png$/);
      uploadedImages.push(body.image);
    }

    currentRole = 'creator';
    const invalidForm = new FormData();
    invalidForm.append('image', new Blob([Buffer.alloc(12)], { type: 'image/png' }), 'invalid.png');
    const invalidResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/users/me/profile-image`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${createToken(creatorId, 'creator')}` },
        body: invalidForm
      }
    );

    assert.equal(invalidResponse.status, 415);
    assert.equal(profileLookupCount, 2);
  } finally {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    for (const imagePath of uploadedImages) {
      try {
        await removePortfolioFile(imagePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});
