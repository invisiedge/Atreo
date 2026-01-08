/**
 * Domain API
 * Handles domain inventory management
 */

import { BaseApiClient } from './client';

export interface DomainRecord {
  id: string;
  domain: string;
  organizationId?: string;
  organization?: { id: string; name: string; domain: string };
  status: 'active' | 'inactive' | 'expired';
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  dnsProvider?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type DomainPayload = Omit<DomainRecord, 'id' | 'organization' | 'createdAt' | 'updatedAt'>;

export class DomainApi extends BaseApiClient {
  async getDomains(): Promise<DomainRecord[]> {
    return this.request<DomainRecord[]>('/domains');
  }

  async createDomain(data: DomainPayload): Promise<DomainRecord> {
    return this.request<DomainRecord>('/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDomain(id: string, data: Partial<DomainPayload>): Promise<DomainRecord> {
    return this.request<DomainRecord>(`/domains/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDomain(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/domains/${id}`, {
      method: 'DELETE',
    });
  }
}
