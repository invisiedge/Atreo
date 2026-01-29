/**
 * Credentials API Client
 * Handles secure credential management operations
 */

import { BaseApi } from './base.api';

export interface CredentialFilters {
  isPaid?: boolean | 'all';
  status?: 'active' | 'inactive' | '';
  category?: string;
  paymentMethod?: 'card' | 'bank' | 'paypal' | 'other' | '';
  billingPeriod?: 'monthly' | 'yearly' | '';
  search?: string;
}


export interface Credential {
  id: string;
  name: string;
  service: string;
  username: string;
  password?: string;
  apiKey: string;
  notes: string;
  tags: string[];
  isPaid?: boolean;
  status?: 'active' | 'inactive';
  paymentMethod?: string | null;
  billingPeriod?: string;
  price?: number;
  hasAutopay?: boolean;
  has2FA?: boolean;
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
   * Get all credentials (passwords masked) with optional filters
   */
  async getCredentials(page = 1, limit = 20, filters?: CredentialFilters): Promise<CredentialsResponse> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters) {
      if (filters.isPaid !== undefined && filters.isPaid !== 'all') {
        params.set('isPaid', String(filters.isPaid));
      }
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
      if (filters.billingPeriod) params.set('billingPeriod', filters.billingPeriod);
      if (filters.search) params.set('search', filters.search);
    }
    const response = await this.get<CredentialsResponse>(`/credentials?${params.toString()}`);
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
