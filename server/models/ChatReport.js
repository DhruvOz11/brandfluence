const mongoose = require('mongoose');

const chatReportSchema = new mongoose.Schema({
  collaborationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collaboration',
    required: true
  },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
  status: {
    type: String,
    enum: ['Open', 'Reviewed', 'Dismissed'],
    default: 'Open'
  },
  createdAt: { type: Date, default: Date.now }
});

chatReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ChatReport', chatReportSchema);
