const express = require('express');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const auth = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const ChatReport = require('../models/ChatReport');
const Collaboration = require('../models/Collaboration');

const router = express.Router();
const chatAuth = auth(['creator', 'brand']);
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: req => String(req.user._id),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'You are sending messages too quickly. Try again shortly.' }
});

const participantFilter = user => ({
  [user.role === 'brand' ? 'brandId' : 'creatorId']: user._id
});

const getConversation = (collaborationId, user) => Collaboration.findOne({
  _id: collaborationId,
  ...participantFilter(user)
});

const getBlockState = (collaboration, role) => {
  const myField = role === 'brand' ? 'brandBlockedAt' : 'creatorBlockedAt';
  const otherField = role === 'brand' ? 'creatorBlockedAt' : 'brandBlockedAt';
  const blocks = collaboration.chatBlocks || {};

  return {
    youBlocked: Boolean(blocks[myField]),
    otherBlocked: Boolean(blocks[otherField])
  };
};

const reportServerError = (res, error, action) => {
  console.error(`Chat ${action} error:`, error);
  return res.status(500).json({ error: `Unable to ${action}` });
};

router.get('/conversations', chatAuth, async (req, res) => {
  try {
    const collaborations = await Collaboration.find(participantFilter(req.user))
      .populate('brandId', 'name image')
      .populate('creatorId', 'name image')
      .sort({ createdAt: -1 });

    const conversations = await Promise.all(collaborations.map(async collaboration => {
      const isBrand = req.user.role === 'brand';
      const partner = isBrand ? collaboration.creatorId : collaboration.brandId;
      const lastMessage = await ChatMessage.findOne({
        collaborationId: collaboration._id
      })
        .sort({ createdAt: -1 })
        .select('body senderId createdAt');
      const unreadCount = await ChatMessage.countDocuments({
        collaborationId: collaboration._id,
        recipientId: req.user._id,
        readAt: null
      });

      return {
        collaborationId: collaboration._id,
        title: collaboration.title || 'Campaign',
        campaignStatus: collaboration.status,
        partner: {
          name: partner?.name || 'Unknown participant',
          image: partner?.image || ''
        },
        lastMessage: lastMessage
          ? {
            body: lastMessage.body,
            createdAt: lastMessage.createdAt,
            isMine: String(lastMessage.senderId) === String(req.user._id)
          }
          : null,
        unreadCount,
        blockState: getBlockState(collaboration, req.user.role)
      };
    }));

    return res.status(200).json({ conversations });
  } catch (err) {
    return reportServerError(res, err, 'load conversations');
  }
});

router.get('/conversations/:id/messages', chatAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const collaboration = await getConversation(req.params.id, req.user);
    if (!collaboration) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await ChatMessage.find({ collaborationId: collaboration._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('senderId', 'name image');

    await ChatMessage.updateMany(
      {
        collaborationId: collaboration._id,
        recipientId: req.user._id,
        readAt: null
      },
      { $set: { readAt: new Date() } }
    );

    const orderedMessages = messages.reverse().map(message => ({
      _id: message._id,
      senderName: message.senderId?.name || 'Participant',
      senderImage: message.senderId?.image || '',
      isMine: String(message.senderId?._id || message.senderId) === String(req.user._id),
      body: message.body,
      createdAt: message.createdAt
    }));

    return res.status(200).json({
      messages: orderedMessages,
      blockState: getBlockState(collaboration, req.user.role)
    });
  } catch (err) {
    return reportServerError(res, err, 'load messages');
  }
});

router.post('/conversations/:id/messages', chatAuth, messageLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    if (typeof req.body?.body !== 'string' || req.body.body.trim().length < 1) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (req.body.body.trim().length > 2000) {
      return res.status(400).json({ error: 'Message must be 2000 characters or fewer' });
    }

    const collaboration = await getConversation(req.params.id, req.user);
    if (!collaboration) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const blockState = getBlockState(collaboration, req.user.role);
    if (blockState.youBlocked || blockState.otherBlocked) {
      return res.status(423).json({ error: 'Messaging is disabled while either participant has blocked this chat' });
    }

    const recipientId = req.user.role === 'brand'
      ? collaboration.creatorId
      : collaboration.brandId;
    const message = new ChatMessage({
      collaborationId: collaboration._id,
      senderId: req.user._id,
      recipientId,
      body: req.body.body.trim()
    });
    await message.save();

    return res.status(201).json({
      message: {
        _id: message._id,
        senderName: req.user.name || 'You',
        senderImage: req.user.image || '',
        isMine: true,
        body: message.body,
        createdAt: message.createdAt
      }
    });
  } catch (err) {
    return reportServerError(res, err, 'send message');
  }
});

router.put('/conversations/:id/block', chatAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    if (typeof req.body?.blocked !== 'boolean') {
      return res.status(400).json({ error: 'Blocked must be true or false' });
    }

    const blockField = req.user.role === 'brand' ? 'brandBlockedAt' : 'creatorBlockedAt';
    const collaboration = await Collaboration.findOneAndUpdate(
      {
        _id: req.params.id,
        ...participantFilter(req.user)
      },
      {
        $set: {
          [`chatBlocks.${blockField}`]: req.body.blocked ? new Date() : null
        }
      },
      { new: true }
    );

    if (!collaboration) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({
      blockState: getBlockState(collaboration, req.user.role)
    });
  } catch (err) {
    return reportServerError(res, err, 'update chat block');
  }
});

router.post('/conversations/:id/reports', chatAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    if (
      typeof req.body?.reason !== 'string'
      || req.body.reason.trim().length < 10
      || req.body.reason.trim().length > 1000
    ) {
      return res.status(400).json({ error: 'Report reason must be between 10 and 1000 characters' });
    }

    const collaboration = await getConversation(req.params.id, req.user);
    if (!collaboration) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const reportedUserId = req.user.role === 'brand'
      ? collaboration.creatorId
      : collaboration.brandId;
    let messageId = null;
    if (req.body.messageId) {
      if (!mongoose.isValidObjectId(req.body.messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }
      const reportedMessage = await ChatMessage.findOne({
        _id: req.body.messageId,
        collaborationId: collaboration._id,
        senderId: reportedUserId
      });
      if (!reportedMessage) {
        return res.status(404).json({ error: 'Message not found in this conversation' });
      }
      messageId = reportedMessage._id;
    }

    const report = new ChatReport({
      collaborationId: collaboration._id,
      reporterId: req.user._id,
      reportedUserId,
      messageId,
      reason: req.body.reason.trim()
    });
    await report.save();

    return res.status(201).json({
      message: 'Report submitted for review',
      reportId: report._id
    });
  } catch (err) {
    return reportServerError(res, err, 'submit report');
  }
});

module.exports = router;
