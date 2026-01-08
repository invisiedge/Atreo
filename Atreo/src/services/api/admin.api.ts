/**
 * Admin API
 * Handles admin-related API calls
 */

import type { Admin, CreateAdminRequest, UpdateAdminRequest } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class AdminApi extends BaseApiClient {
  async getAdmins(): Promise<Admin[]> {
    const data = await this.request<any[]>(API_ENDPOINTS.ADMINS.BASE);
    // Transform _id to id for frontend compatibility
    return data.map(admin => ({
      ...admin,
      id: admin._id,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
    }));
  }

  async createAdmin(data: CreateAdminRequest): Promise<Admin> {
    const response = await this.request<any>(API_ENDPOINTS.ADMINS.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Transform _id to id for frontend compatibility
    return {
      ...response,
      id: response._id,
      createdAt: response.createdAt,
      lastLogin: response.lastLogin,
    };
  }

  async updateAdmin(id: string, data: UpdateAdminRequest): Promise<Admin> {
    const response = await this.request<any>(API_ENDPOINTS.ADMINS.BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    // Transform _id to id for frontend compatibility
    return {
      ...response,
      id: response._id,
      createdAt: response.createdAt,
      lastLogin: response.lastLogin,
    };
  }

  async deleteAdmin(id: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.ADMINS.BY_ID(id), {
      method: 'DELETE',
    });
  }

  async updateAdminStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<Admin> {
    const response = await this.request<any>(`/admins/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return {
      ...response,
      id: response._id,
      createdAt: response.createdAt,
      lastLogin: response.lastLogin,
    };
  }
}
