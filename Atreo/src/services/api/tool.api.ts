/**
 * Tool API
 * Handles tool/resource-related API calls
 */

import type { Tool } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class ToolApi extends BaseApiClient {
  async getTools(): Promise<Tool[]> {
    return this.request<Tool[]>(API_ENDPOINTS.TOOLS.BASE);
  }

  async getToolById(id: string): Promise<Tool> {
    return this.request<Tool>(API_ENDPOINTS.TOOLS.BY_ID(id));
  }

  async createTool(data: Partial<Tool>): Promise<Tool> {
    return this.request<Tool>(API_ENDPOINTS.TOOLS.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTool(id: string, data: Partial<Tool>): Promise<Tool> {
    return this.request<Tool>(API_ENDPOINTS.TOOLS.BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTool(id: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.TOOLS.BY_ID(id), {
      method: 'DELETE',
    });
  }

  async importExcel(file: File): Promise<{
    success: boolean;
    message: string;
    imported: number;
    skipped: number;
    errors: number;
    errorDetails: Array<{ row: number; toolName: string; error: string }>;
    tools: Array<{ id: string; name: string; category?: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{
      success: boolean;
      message: string;
      imported: number;
      skipped: number;
      errors: number;
      errorDetails: Array<{ row: number; toolName: string; error: string }>;
      tools: Array<{ id: string; name: string; category?: string }>;
    }>('/tools/import-excel', {
      method: 'POST',
      body: formData,
    });
  }

  async getUsersForSharing(): Promise<Array<{ id: string; name: string; email: string }>> {
    return this.request<Array<{ id: string; name: string; email: string }>>('/tools/share/users');
  }

  async shareTool(toolId: string, data: { userId: string; permission: 'view' | 'edit' }): Promise<void> {
    return this.request<void>(`/tools/${toolId}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAllTools(): Promise<{ message: string; deletedCount: number; totalCount: number }> {
    return this.request<{ message: string; deletedCount: number; totalCount: number }>('/tools/delete-all', {
      method: 'DELETE',
    });
  }
}
