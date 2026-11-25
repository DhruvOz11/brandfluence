const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, maxlength: 100, default: 'Campaign' },
  purpose: { type: String, required: true },
  deliverables: { type: String, required: true },
  budget: { type: Number, min: 0, default: 0 },
  dueDate: { type: Date },
  timeLimit: { type: String },
  charges: { type: Number, required: true }, 
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'In Progress', 'Submitted', 'Completed', 'Rejected'],
    default: 'Pending'
  },
  submissionNote: { type: String, maxlength: 1000, default: '' },
  chatBlocks: {
    brandBlockedAt: { type: Date, default: null },
    creatorBlockedAt: { type: Date, default: null }
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'In Progress', 'Submitted', 'Completed', 'Rejected'],
      required: true
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 1000, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Collaboration', collaborationSchema);