const mongoose = require('mongoose');

/**
 * Permission Model - 3-Layer Permission System
 * 
 * Layer 1: Module Access - Decides if a section exists for the user
 * Layer 2: Page Access - Decides which pages inside that module are visible
 * Layer 3: Access Type - Decides if user can only read or also write
 */
const permissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true
  },
  // 3-Layer Permission Structure: modules -> pages -> accessType
  // Format: { module: { page: { read: Boolean, write: Boolean } } }
  modules: {
    type: Map,
    of: {
      pages: {
        type: Map,
        of: {
          read: { type: Boolean, default: false },
          write: { type: Boolean, default: false }
        }
      }
    },
    default: {}
  },
  // Created/Updated by Super Admin only
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
permissionSchema.index({ 'modules': 1 });

// Helper method to check module access
// Layer 1: Module Access - Decides if a section exists for the user
permissionSchema.methods.hasModuleAccess = function(module) {
  return this.modules.has(module);
};

// Helper method to check page access
// Layer 2: Page Access - Decides which pages inside that module are visible
// Layer 3: Access Type - Decides if user can only read or also write
permissionSchema.methods.hasPageAccess = function(module, page, accessType = 'read') {
  // Layer 1: Check module access first
  if (!this.hasModuleAccess(module)) {
    return false;
  }
  
  const moduleData = this.modules.get(module);
  if (!moduleData || !moduleData.pages) {
    return false;
  }
  
  // Layer 2: Check page access
  const pageData = moduleData.pages.get(page);
  if (!pageData) {
    return false;
  }
  
  // Layer 3: Check access type (read or write)
  if (accessType === 'write') {
    return pageData.write === true;
  }
  // For read access, either read or write permission is sufficient
  return pageData.read === true || pageData.write === true;
};

module.exports = mongoose.model('Permission', permissionSchema);

