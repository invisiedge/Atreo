/**
 * Auth API
 * Handles authentication-related API calls
 */

import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  User,
} from '@/types';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/constants';
import { BaseApiClient } from './client';

export class AuthApi extends BaseApiClient {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
    return response;
  }

  async signup(data: SignupRequest): Promise<SignupResponse> {
    const response = await this.request<SignupResponse>(API_ENDPOINTS.AUTH.SIGNUP, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  }

  async resetPassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>('/auth/me');
    return response.user;
  }
}
