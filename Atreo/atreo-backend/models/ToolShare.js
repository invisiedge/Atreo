const mongoose = require('mongoose');

const toolShareSchema = new mongoose.Schema({
  toolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true,
    index: true
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: String,
    enum: ['view', 'edit'],
    default: 'view'
  },
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure one share per tool-user combination
toolShareSchema.index({ toolId: 1, sharedWith: 1 }, { unique: true });

module.exports = mongoose.model('ToolShare', toolShareSchema);

