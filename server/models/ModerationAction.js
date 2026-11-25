const mongoose = require('mongoose');

const moderationActionSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'verification_approved',
      'verification_rejected',
      'account_suspended',
      'account_reactivated',
      'chat_report_reviewed',
      'chat_report_dismissed'
    ],
    required: true
  },
  subjectId: { type: String, required: true },
  subjectType: { type: String, enum: ['user', 'chat_report'], required: true },
  actorId: { type: String, required: true, default: 'admin' },
  details: { type: String, maxlength: 1000, default: '' },
  createdAt: { type: Date, default: Date.now }
});

moderationActionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModerationAction', moderationActionSchema);
