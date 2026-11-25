const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  tokenVersion: { type: Number, default: 0, select: false },
  role: { type: String, enum: ['creator', 'brand', 'admin'], default: 'creator' },
  instagramProfile: { type: String, default: '' },
  followers: { type: Number, default: 0 },
  image: {
    type: String,
    default: '/default-avatar.png'
  },
  description: { type: String, default: '' },
  city: { type: String, default: 'Not specified' },
  category: { type: String, default: 'General' },
  charges: { type: Number, default: 0 },
  totalDeals: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['Not Requested', 'Pending', 'Approved', 'Rejected'],
    default: 'Not Requested'
  },
  verificationEvidence: { type: String, maxlength: 1000, default: '' },
  verificationDecisionReason: { type: String, maxlength: 500, default: '' },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String, maxlength: 500, default: '' },
  suspendedAt: { type: Date, default: null },
  suspendedBy: { type: String, default: '' },
  portfolio: [{
    filename: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    caption: { type: String, maxlength: 200, default: '' },
    position: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
});

module.exports = mongoose.model('User', userSchema);