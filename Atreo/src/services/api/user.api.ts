/**
 * User API
 * Handles user profile-related API calls and admin user management
 */

import type { UserProfile, UpdateUserProfileRequest, User } from '@/types';
import { BaseApiClient } from './client';

export class UserApi extends BaseApiClient {
  async getUserProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/user/profile');
  }

  async updateUserProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    return this.request<UserProfile>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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
    role?: 'admin' | 'user';
    employeeId?: string;
    permissions?: string[];
  }): Promise<User> {
    const response = await this.request<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.user;
  }

  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<User> {
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
}
