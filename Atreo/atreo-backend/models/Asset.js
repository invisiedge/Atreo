const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['folder', 'file'],
    required: true
  },
  parentFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    default: null // null means root level
  },
  fileUrl: {
    type: String,
    default: null // Only for files
  },
  fileName: {
    type: String,
    default: null // Only for files
  },
  fileSize: {
    type: Number,
    default: null // Only for files (in bytes)
  },
  mimeType: {
    type: String,
    default: null // Only for files
  },
  description: {
    type: String,
    trim: true
  },
  tags: {
    type: [String],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient folder queries
assetSchema.index({ parentFolderId: 1, isActive: 1 });
assetSchema.index({ createdBy: 1, isActive: 1 });
assetSchema.index({ type: 1 });

// Prevent duplicate folder names in the same parent
assetSchema.index({ parentFolderId: 1, name: 1, type: 1 }, { unique: true, sparse: true });

// Virtual for path (can be computed if needed)
assetSchema.virtual('path').get(function() {
  // This would need to be computed by traversing parent folders
  return this.name;
});

// Standardize JSON output
assetSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Asset', assetSchema);

