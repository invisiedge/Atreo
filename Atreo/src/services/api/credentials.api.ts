/**
 * Credentials API Client
 * Handles secure credential management operations
 */

import { BaseApi } from './base.api';

export interface Credential {
  id: string;
  name: string;
  service: string;
  username: string;
  password?: string;
  apiKey: string;
  notes: string;
  tags: string[];
}

export interface CreateCredentialRequest {
  name: string;
  service: string;
  username?: string;
  password?: string;
  apiKey?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateCredentialRequest extends Partial<CreateCredentialRequest> {}

export interface CredentialsResponse {
  credentials: Credential[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class CredentialsApi extends BaseApi {
  /**
   * Get all credentials (passwords masked)
   */
  async getCredentials(page = 1, limit = 10): Promise<CredentialsResponse> {
    const response = await this.get<CredentialsResponse>(`/credentials?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Get specific credential with decrypted password
   */
  async getCredential(id: string): Promise<{ credential: Credential }> {
    const response = await this.get<{ credential: Credential }>(`/credentials/${id}`);
    return response.data;
  }

  /**
   * Create new credential
   */
  async createCredential(data: CreateCredentialRequest): Promise<{ message: string; credential: Partial<Credential> }> {
    const response = await this.post<{ message: string; credential: Partial<Credential> }>('/credentials', data);
    return response.data;
  }

  /**
   * Update credential
   */
  async updateCredential(id: string, data: UpdateCredentialRequest): Promise<{ message: string; credential: Partial<Credential> }> {
    const response = await this.put<{ message: string; credential: Partial<Credential> }>(`/credentials/${id}`, data);
    return response.data;
  }

  /**
   * Delete credential
   */
  async deleteCredential(id: string): Promise<{ message: string }> {
    const response = await this.delete<{ message: string }>(`/credentials/${id}`);
    return response.data;
  }
}
