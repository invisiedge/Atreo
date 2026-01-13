/**
 * User API
 * Handles user profile-related API calls and admin user management
 */

import type { UserProfile, UpdateUserProfileRequest, User } from '@/types';
import { BaseApiClient } from './client';

export class UserApi extends BaseApiClient {
  async getUserProfile(): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile }>('/users/profile/me');
    return response.user;
  }

  async updateUserProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const response = await this.request<{ user: UserProfile; message: string }>('/users/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.user;
  }

  // Admin user management methods
  async getUsers(params?: { status?: string; role?: string; page?: number; limit?: number }): Promise<{ users: User[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const queryString = queryParams.toString();
    return this.request<{ users: User[]; pagination: any }>(`/users${queryString ? `?${queryString}` : ''}`);
  }

  async clearAllUsers(): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>('/users/clear-all', {
      method: 'DELETE'
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'user' | 'accountant';
    employeeId?: string;
    permissions?: string[];
  }): Promise<User> {
    const response = await this.request<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.user;
  }

  async updateUserRole(userId: string, role: 'admin' | 'user' | 'accountant'): Promise<User> {
    const response = await this.request<{ user: User }>(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return response.user;
  }

  async updateUserAdminRole(userId: string, adminRole: 'admin' | 'super-admin'): Promise<User> {
    const response = await this.request<{ user: User }>(`/users/${userId}/admin-role`, {
      method: 'PATCH',
      body: JSON.stringify({ adminRole }),
    });
    return response.user;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await this.request<{ user: User }>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return response.user;
  }

  async updateUserPermissions(userId: string, permissions: string[]): Promise<User> {
    const response = await this.request<{ user: User }>(`/users/${userId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
    return response.user;
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Upload a document for the current user's profile
   * @param documentType - Type of document (resume, offerLetter, employeeAgreement, nda, govtId, passport, addressProof, pan, taxId)
   * @param file - File to upload
   */
  async uploadDocument(documentType: string, file: File): Promise<{ message: string; documentType: string; fileUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request<{ message: string; documentType: string; fileUrl: string }>(
      `/users/profile/me/documents/${documentType}`,
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  /**
   * Delete a document from the current user's profile
   * @param documentType - Type of document to delete
   */
  async deleteDocument(documentType: string): Promise<{ message: string; documentType: string }> {
    return this.request<{ message: string; documentType: string }>(
      `/users/profile/me/documents/${documentType}`,
      {
        method: 'DELETE',
      }
    );
  }
}
