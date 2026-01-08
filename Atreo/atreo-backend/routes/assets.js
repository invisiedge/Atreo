const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const { authenticateToken } = require('../middleware/auth');
const storageService = require('../services/storageService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const memoryStorage = multer.memoryStorage();
const uploadForParsing = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// Helper function to check if a folder is a descendant
async function isDescendantFolder(folderId, potentialAncestorId) {
  if (!potentialAncestorId) return false;
  if (folderId.toString() === potentialAncestorId.toString()) return true;

  const folder = await Asset.findById(potentialAncestorId);
  if (!folder || !folder.parentFolderId) return false;

  return isDescendantFolder(folderId, folder.parentFolderId);
}

// Get all assets (with folder structure)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { folderId } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const query = { isActive: true };
    
    if (folderId && folderId !== 'root') {
      query.parentFolderId = folderId;
    } else {
      query.parentFolderId = null;
    }

    if (userRole !== 'admin') {
      query.createdBy = userId;
    }

    const assets = await Asset.find(query)
      .populate('createdBy', 'name email')
      .populate('parentFolderId', 'name')
      .populate('organizationId', 'name')
      .sort({ type: 1, name: 1 })
      .lean();

    const formattedAssets = assets.map(asset => ({
      id: asset._id.toString(),
      name: asset.name,
      type: asset.type,
      parentFolderId: asset.parentFolderId ? asset.parentFolderId.toString() : null,
      fileUrl: asset.fileUrl,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      description: asset.description,
      tags: asset.tags || [],
      createdBy: asset.createdBy ? {
        id: asset.createdBy._id.toString(),
        name: asset.createdBy.name,
        email: asset.createdBy.email
      } : null,
      organizationId: asset.organizationId ? asset.organizationId.toString() : null,
      isActive: asset.isActive,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    }));

    res.json(formattedAssets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Failed to fetch assets' });
  }
});

// Get single asset
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('parentFolderId', 'name')
      .populate('organizationId', 'name')
      .lean();

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (req.user.role !== 'admin' && asset.createdBy._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      id: asset._id.toString(),
      name: asset.name,
      type: asset.type,
      parentFolderId: asset.parentFolderId ? asset.parentFolderId.toString() : null,
      fileUrl: asset.fileUrl,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      description: asset.description,
      tags: asset.tags || [],
      createdBy: asset.createdBy ? {
        id: asset.createdBy._id.toString(),
        name: asset.createdBy.name,
        email: asset.createdBy.email
      } : null,
      organizationId: asset.organizationId ? asset.organizationId.toString() : null,
      isActive: asset.isActive,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ message: 'Failed to fetch asset' });
  }
});

// Create folder
router.post('/folder', authenticateToken, async (req, res) => {
  try {
    const { name, parentFolderId, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const existingFolder = await Asset.findOne({
      name: name.trim(),
      type: 'folder',
      parentFolderId: parentFolderId || null,
      isActive: true
    });

    if (existingFolder) {
      return res.status(400).json({ message: 'A folder with this name already exists in this location' });
    }

    const folder = new Asset({
      name: name.trim(),
      type: 'folder',
      parentFolderId: parentFolderId || null,
      description: description || '',
      createdBy: req.user.userId,
      isActive: true
    });

    await folder.save();

    const populatedFolder = await Asset.findById(folder._id)
      .populate('createdBy', 'name email')
      .populate('parentFolderId', 'name')
      .lean();

    res.status(201).json({
      id: populatedFolder._id.toString(),
      name: populatedFolder.name,
      type: populatedFolder.type,
      parentFolderId: populatedFolder.parentFolderId ? populatedFolder.parentFolderId.toString() : null,
      description: populatedFolder.description,
      createdBy: populatedFolder.createdBy ? {
        id: populatedFolder.createdBy._id.toString(),
        name: populatedFolder.createdBy.name,
        email: populatedFolder.createdBy.email
      } : null,
      createdAt: populatedFolder.createdAt,
      updatedAt: populatedFolder.updatedAt
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Failed to create folder' });
  }
});

// Upload file asset
router.post('/file', authenticateToken, uploadForParsing.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const { name, parentFolderId, description, tags } = req.body;

    const gcsFileName = `assets/${Date.now()}-${req.file.originalname}`;
    const fileUrl = await storageService.uploadFile(req.file, gcsFileName);

    const fileAsset = new Asset({
      name: name || req.file.originalname,
      type: 'file',
      parentFolderId: parentFolderId || null,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description: description || '',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      createdBy: req.user.userId,
      isActive: true
    });

    await fileAsset.save();

    const populatedAsset = await Asset.findById(fileAsset._id)
      .populate('createdBy', 'name email')
      .populate('parentFolderId', 'name')
      .lean();

    res.status(201).json({
      id: populatedAsset._id.toString(),
      name: populatedAsset.name,
      type: populatedAsset.type,
      parentFolderId: populatedAsset.parentFolderId ? populatedAsset.parentFolderId.toString() : null,
      fileUrl: populatedAsset.fileUrl,
      fileName: populatedAsset.fileName,
      fileSize: populatedAsset.fileSize,
      mimeType: populatedAsset.mimeType,
      description: populatedAsset.description,
      tags: populatedAsset.tags || [],
      createdBy: populatedAsset.createdBy ? {
        id: populatedAsset.createdBy._id.toString(),
        name: populatedAsset.createdBy.name,
        email: populatedAsset.createdBy.email
      } : null,
      createdAt: populatedAsset.createdAt,
      updatedAt: populatedAsset.updatedAt
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Update asset
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, parentFolderId, description, tags } = req.body;
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (req.user.role !== 'admin' && asset.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name !== undefined) {
      const existingAsset = await Asset.findOne({
        name: name.trim(),
        type: asset.type,
        parentFolderId: parentFolderId !== undefined ? parentFolderId : asset.parentFolderId,
        _id: { $ne: asset._id },
        isActive: true
      });

      if (existingAsset) {
        return res.status(400).json({ message: 'An asset with this name already exists in this location' });
      }

      asset.name = name.trim();
    }

    if (parentFolderId !== undefined) {
      if (asset.type === 'folder' && parentFolderId) {
        const isDescendant = await isDescendantFolder(asset._id, parentFolderId);
        if (isDescendant) {
          return res.status(400).json({ message: 'Cannot move folder into its own subfolder' });
        }
      }
      asset.parentFolderId = parentFolderId || null;
    }

    if (description !== undefined) asset.description = description;
    if (tags !== undefined) asset.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    await asset.save();

    const updatedAsset = await Asset.findById(asset._id)
      .populate('createdBy', 'name email')
      .populate('parentFolderId', 'name')
      .lean();

    res.json({
      id: updatedAsset._id.toString(),
      name: updatedAsset.name,
      type: updatedAsset.type,
      parentFolderId: updatedAsset.parentFolderId ? updatedAsset.parentFolderId.toString() : null,
      fileUrl: updatedAsset.fileUrl,
      fileName: updatedAsset.fileName,
      fileSize: updatedAsset.fileSize,
      mimeType: updatedAsset.mimeType,
      description: updatedAsset.description,
      tags: updatedAsset.tags || [],
      createdBy: updatedAsset.createdBy ? {
        id: updatedAsset.createdBy._id.toString(),
        name: updatedAsset.createdBy.name,
        email: updatedAsset.createdBy.email
      } : null,
      createdAt: updatedAsset.createdAt,
      updatedAt: updatedAsset.updatedAt
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ message: 'Failed to update asset' });
  }
});

// Delete asset (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (req.user.role !== 'admin' && asset.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (asset.type === 'folder') {
      const children = await Asset.countDocuments({ 
        parentFolderId: asset._id, 
        isActive: true 
      });
      
      if (children > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete folder with contents. Please delete or move all items first.' 
        });
      }
    }

    asset.isActive = false;
    await asset.save();

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ message: 'Failed to delete asset' });
  }
});

// Get folder path (breadcrumb)
router.get('/:id/path', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const path = [];
    let currentAsset = asset;

    while (currentAsset && currentAsset.parentFolderId) {
      const parent = await Asset.findById(currentAsset.parentFolderId);
      if (parent) {
        path.unshift({
          id: parent._id.toString(),
          name: parent.name
        });
        currentAsset = parent;
      } else {
        break;
      }
    }

    res.json(path);
  } catch (error) {
    console.error('Error getting folder path:', error);
    res.status(500).json({ message: 'Failed to get folder path' });
  }
});

module.exports = router;
