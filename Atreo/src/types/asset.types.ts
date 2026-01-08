/**
 * Asset Types
 */

export interface Asset {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentFolderId: string | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  tags?: string[];
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  organizationId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
  parentFolderId?: string | null;
  description?: string;
}

export interface UpdateAssetRequest {
  name?: string;
  parentFolderId?: string | null;
  description?: string;
  tags?: string[];
}

export interface FolderPathItem {
  id: string;
  name: string;
}

