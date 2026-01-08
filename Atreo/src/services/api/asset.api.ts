/**
 * Asset API
 * Handles asset and folder management
 */

import type { Asset, CreateFolderRequest, UpdateAssetRequest, FolderPathItem } from '@/types/asset.types';
import { BaseApiClient } from './client';

export class AssetApi extends BaseApiClient {
  async getAssets(folderId?: string | null): Promise<Asset[]> {
    const queryParams = folderId ? `?folderId=${folderId}` : '?folderId=root';
    return this.request<Asset[]>(`/assets${queryParams}`);
  }

  async getAsset(assetId: string): Promise<Asset> {
    return this.request<Asset>(`/assets/${assetId}`);
  }

  async createFolder(data: CreateFolderRequest): Promise<Asset> {
    return this.request<Asset>('/assets/folder', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadFile(
    file: File,
    data: {
      name?: string;
      parentFolderId?: string | null;
      description?: string;
      tags?: string[];
    }
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    if (data.name) formData.append('name', data.name);
    if (data.parentFolderId) formData.append('parentFolderId', data.parentFolderId);
    if (data.description) formData.append('description', data.description);
    if (data.tags) {
      formData.append('tags', Array.isArray(data.tags) ? data.tags.join(',') : data.tags);
    }

    // BaseApiClient handles FormData correctly (doesn't set Content-Type)
    return this.request<Asset>('/assets/file', {
      method: 'POST',
      body: formData,
    });
  }

  async updateAsset(assetId: string, data: UpdateAssetRequest): Promise<Asset> {
    return this.request<Asset>(`/assets/${assetId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(assetId: string): Promise<void> {
    return this.request<void>(`/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  async getFolderPath(assetId: string): Promise<FolderPathItem[]> {
    return this.request<FolderPathItem[]>(`/assets/${assetId}/path`);
  }
}

