const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true
});

// Index for better query performance
// domain already has unique: true which creates an index

// Standardize JSON output
organizationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Organization', organizationSchema);

