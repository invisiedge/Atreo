import { useState, useEffect } from 'react';
import { 
  FiFolder, 
  FiSearch, 
  FiDownload,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiX,
  FiUpload,
  FiCalendar,
  FiFile,
  FiArrowLeft,
  FiFileText
} from 'react-icons/fi';
import { apiClient } from '@/services/api';
import type { Asset, FolderPathItem } from '@/types';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/lib/logger';

export default function AdminAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Form states
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  
  const { showToast, ToastContainer } = useToast();

  // Load assets
  const loadAssets = async (folderId: string | null = null) => {
    try {
      setLoading(true);
      const data = await apiClient.getAssets(folderId || undefined);
      setAssets(data);
      
      // Load folder path if in a folder
      if (folderId) {
        try {
          const path = await apiClient.getFolderPath(folderId);
          setFolderPath(path);
        } catch (error) {
          logger.error('Failed to load folder path', error);
          setFolderPath([]);
        }
      } else {
        setFolderPath([]);
      }
    } catch (error: any) {
      logger.error('Failed to load assets', error);
      showToast(error.message || 'Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets(currentFolderId);
  }, [currentFolderId]);

  // Filter assets by search query
  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return asset.name.toLowerCase().includes(query) ||
           asset.description?.toLowerCase().includes(query) ||
           asset.tags?.some(tag => tag.toLowerCase().includes(query));
  });

  // Separate folders and files
  const folders = filteredAssets.filter(a => a.type === 'folder');
  const files = filteredAssets.filter(a => a.type === 'file');

  // Create folder
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      showToast('Folder name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.createFolder({
        name: folderName.trim(),
        parentFolderId: currentFolderId,
        description: folderDescription.trim() || undefined,
      });
      
      showToast('Folder created successfully', 'success');
      
      setShowCreateFolderModal(false);
      setFolderName('');
      setFolderDescription('');
      await loadAssets(currentFolderId);
    } catch (error: any) {
      logger.error('Failed to create folder', error);
      showToast(error.message || 'Failed to create folder', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Upload file
  const handleUploadFile = async () => {
    if (!uploadFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.uploadFile(uploadFile, {
        name: uploadFileName.trim() || uploadFile.name,
        parentFolderId: currentFolderId,
        description: uploadDescription.trim() || undefined,
        tags: uploadTags ? uploadTags.split(',').map(t => t.trim()) : undefined,
      });
      
      showToast('File uploaded successfully', 'success');
      
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadFileName('');
      setUploadDescription('');
      setUploadTags('');
      await loadAssets(currentFolderId);
    } catch (error: any) {
      logger.error('Failed to upload file', error);
      showToast(error.message || 'Failed to upload file', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update asset
  const handleUpdateAsset = async () => {
    if (!selectedAsset) return;

    try {
      setLoading(true);
      await apiClient.updateAsset(selectedAsset.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        tags: editTags ? editTags.split(',').map(t => t.trim()) : undefined,
      });
      
      showToast('Asset updated successfully', 'success');
      
      setShowEditModal(false);
      setSelectedAsset(null);
      await loadAssets(currentFolderId);
    } catch (error: any) {
      logger.error('Failed to update asset', error);
      showToast(error.message || 'Failed to update asset', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete asset
  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.deleteAsset(asset.id);
      
      showToast('Asset deleted successfully', 'success');
      
      await loadAssets(currentFolderId);
    } catch (error: any) {
      logger.error('Failed to delete asset', error);
      showToast(error.message || 'Failed to delete asset', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  // Navigate to parent folder
  const navigateToParent = () => {
    if (folderPath.length > 0) {
      const parentId = folderPath[folderPath.length - 1].id;
      setCurrentFolderId(parentId);
    } else {
      setCurrentFolderId(null);
    }
  };

  // Navigate to root
  const navigateToRoot = () => {
    setCurrentFolderId(null);
  };

  // Open edit modal
  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditName(asset.name);
    setEditDescription(asset.description || '');
    setEditTags(asset.tags?.join(', ') || '');
    setShowEditModal(true);
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return FiFile;
    if (mimeType.startsWith('image/')) return FiEye;
    if (mimeType.includes('pdf')) return FiFileText;
    return FiFile;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assets</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage and organize your files and folders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground rounded-xl hover:bg-accent transition-colors font-medium"
          >
            <FiFolder className="h-5 w-5" />
            New Folder
          </button>
        <button
            onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 font-medium"
        >
            <FiUpload className="h-5 w-5" />
            Upload File
        </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={navigateToRoot}
            className="hover:text-foreground transition-colors"
          >
            Root
          </button>
          {folderPath.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span>/</span>
        <button
                onClick={() => navigateToFolder(item.id)}
                className="hover:text-foreground transition-colors"
              >
                {item.name}
              </button>
            </div>
          ))}
                </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
          />
        </div>
            <button
          onClick={() => loadAssets(currentFolderId)}
          className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl hover:bg-accent transition-colors bg-card"
          disabled={loading}
        >
          <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        {currentFolderId && (
          <button
            onClick={navigateToParent}
            className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl hover:bg-accent transition-colors bg-card"
          >
            <FiArrowLeft className="h-5 w-5" />
            Back
          </button>
        )}
      </div>

      {/* Assets Display */}
      {loading && assets.length === 0 ? (
        <div className="text-center py-16">
          <FiRefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <FiFolder className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No assets found</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              {searchQuery 
                ? 'No assets match your search query.'
                : 'Get started by creating a folder or uploading a file.'
              }
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl hover:bg-accent transition-colors font-medium"
              >
                <FiFolder className="h-5 w-5" />
                Create Folder
              </button>
            <button
                onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
            >
              <FiUpload className="h-5 w-5" />
                Upload File
            </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {folders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Folders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group bg-card rounded-xl border border-border hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <FiFolder className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(folder)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(folder)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => navigateToFolder(folder.id)}
                        className="w-full text-left"
                      >
                        <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{folder.name}</h3>
                        {folder.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{folder.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FiCalendar className="h-3 w-3" />
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Files</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.mimeType);
                  return (
                    <div
                      key={file.id}
                      className="group bg-card rounded-xl border border-border hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <FileIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {file.fileUrl && (
                      <button
                                onClick={() => window.open(file.fileUrl, '_blank')}
                                className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="View"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                              onClick={() => file.fileUrl && window.open(file.fileUrl, '_blank')}
                              className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      title="Download"
                    >
                      <FiDownload className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(file)}
                              className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(file)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{file.name}</h3>
                        {file.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{file.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <FiCalendar className="h-3 w-3" />
                            {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                          <span>{formatFileSize(file.fileSize)}</span>
                        </div>
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {file.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {file.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-muted-foreground text-xs">
                                +{file.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Create New Folder</h2>
                      <button
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setFolderName('');
                  setFolderDescription('');
                }}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
                      </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                      <button
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setFolderName('');
                  setFolderDescription('');
                }}
                className="px-5 py-2.5 text-foreground bg-card border border-border rounded-xl hover:bg-accent transition-colors font-medium"
              >
                Cancel
                      </button>
                      <button
                onClick={handleCreateFolder}
                disabled={loading || !folderName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                {loading ? 'Creating...' : 'Create Folder'}
                      </button>
                    </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Upload File</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadFileName('');
                  setUploadDescription('');
                  setUploadTags('');
                }}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setUploadFile(file || null);
                    if (file) setUploadFileName(file.name);
                  }}
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="Enter file name (defaults to file name)"
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Enter file description"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadFileName('');
                  setUploadDescription('');
                  setUploadTags('');
                }}
                className="px-5 py-2.5 text-foreground bg-card border border-border rounded-xl hover:bg-accent transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadFile}
                disabled={loading || !uploadFile}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {showEditModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Edit Asset</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAsset(null);
                }}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter asset name"
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
                  autoFocus
                />
                </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter asset description"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground resize-none"
                />
              </div>
              {selectedAsset.type === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Enter tags separated by commas"
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-card text-foreground"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAsset(null);
                }}
                className="px-5 py-2.5 text-foreground bg-card border border-border rounded-xl hover:bg-accent transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAsset}
                disabled={loading || !editName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}
