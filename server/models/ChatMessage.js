const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  collaborationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collaboration',
    required: true
  },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date, default: null }
});

chatMessageSchema.index({ collaborationId: 1, createdAt: 1 });
chatMessageSchema.index({ recipientId: 1, readAt: 1, collaborationId: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
