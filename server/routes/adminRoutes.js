const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const ChatReport = require('../models/ChatReport');
const ModerationAction = require('../models/ModerationAction');
const auth = require('../middleware/auth');

const router = express.Router();
const adminAuth = auth(['admin']);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const saveAction = (action, subjectId, subjectType, details) => (
  new ModerationAction({
    action,
    subjectId: String(subjectId),
    subjectType,
    actorId: 'admin',
    details
  }).save()
);

const handleAdminError = (res, error, action) => {
  console.error(`Admin ${action} error:`, error);
  return res.status(500).json({ error: `Unable to ${action}` });
};

router.get('/users', adminAuth, async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const filter = { role: { $in: ['creator', 'brand'] } };
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('name email role image isSuspended suspensionReason suspendedAt isVerified verificationStatus')
      .sort({ name: 1 })
      .limit(100);
    return res.status(200).json({ users });
  } catch (err) {
    return handleAdminError(res, err, 'load accounts');
  }
});

router.get('/verification-requests', adminAuth, async (req, res) => {
  try {
    const requests = await User.find({
      role: 'creator',
      verificationStatus: 'Pending'
    })
      .select('name email image category city instagramProfile verificationEvidence verificationStatus createdAt')
      .sort({ createdAt: 1 })
      .limit(100);
    return res.status(200).json({ requests });
  } catch (err) {
    return handleAdminError(res, err, 'load verification requests');
  }
});

router.put('/verification-requests/:id', adminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid creator ID' });
    }

    const { decision, reason } = req.body || {};
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be Approved or Rejected' });
    }
    if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
      return res.status(400).json({ error: 'Decision reason must be between 10 and 500 characters' });
    }

    const creator = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: 'creator',
        verificationStatus: 'Pending'
      },
      {
        $set: {
          verificationStatus: decision,
          isVerified: decision === 'Approved',
          verificationDecisionReason: reason.trim()
        }
      },
      { new: true, runValidators: true }
    ).select('name email isVerified verificationStatus verificationDecisionReason');

    if (!creator) {
      return res.status(409).json({ error: 'Verification request is unavailable or already reviewed' });
    }

    await saveAction(
      decision === 'Approved' ? 'verification_approved' : 'verification_rejected',
      creator._id,
      'user',
      reason.trim()
    );
    return res.status(200).json({ creator });
  } catch (err) {
    return handleAdminError(res, err, 'review verification request');
  }
});

router.put('/users/:id/suspension', adminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    if (typeof req.body?.suspended !== 'boolean') {
      return res.status(400).json({ error: 'Suspended must be true or false' });
    }

    const suspended = req.body.suspended;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (suspended && (reason.length < 10 || reason.length > 500)) {
      return res.status(400).json({ error: 'Suspension reason must be between 10 and 500 characters' });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: { $in: ['creator', 'brand'] }
      },
      {
        $set: {
          isSuspended: suspended,
          suspensionReason: suspended ? reason : '',
          suspendedAt: suspended ? new Date() : null,
          suspendedBy: suspended ? 'admin' : ''
        },
        $inc: { tokenVersion: 1 }
      },
      { new: true, runValidators: true }
    ).select('name email role isSuspended suspensionReason suspendedAt');

    if (!user) return res.status(404).json({ error: 'Account not found' });

    await saveAction(
      suspended ? 'account_suspended' : 'account_reactivated',
      user._id,
      'user',
      suspended ? reason : 'Account reactivated'
    );
    return res.status(200).json({ user });
  } catch (err) {
    return handleAdminError(res, err, 'update account access');
  }
});

router.get('/chat-reports', adminAuth, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'Open';
    if (!['Open', 'Reviewed', 'Dismissed', 'All'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status filter' });
    }
    const filter = status === 'All' ? {} : { status };
    const reports = await ChatReport.find(filter)
      .populate('reporterId', 'name email role')
      .populate('reportedUserId', 'name email role')
      .populate('collaborationId', 'title')
      .populate('messageId', 'body createdAt')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ reports });
  } catch (err) {
    return handleAdminError(res, err, 'load chat reports');
  }
});

router.put('/chat-reports/:id', adminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const { status, reason } = req.body || {};
    if (!['Reviewed', 'Dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Report status must be Reviewed or Dismissed' });
    }
    if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
      return res.status(400).json({ error: 'Review reason must be between 10 and 500 characters' });
    }

    const report = await ChatReport.findOneAndUpdate(
      { _id: req.params.id, status: 'Open' },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!report) {
      return res.status(409).json({ error: 'Report is unavailable or already reviewed' });
    }

    await saveAction(
      status === 'Reviewed' ? 'chat_report_reviewed' : 'chat_report_dismissed',
      report._id,
      'chat_report',
      reason.trim()
    );
    return res.status(200).json({ report });
  } catch (err) {
    return handleAdminError(res, err, 'review chat report');
  }
});

router.get('/moderation-actions', adminAuth, async (req, res) => {
  try {
    const actions = await ModerationAction.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ actions });
  } catch (err) {
    return handleAdminError(res, err, 'load moderation history');
  }
});

module.exports = router;
