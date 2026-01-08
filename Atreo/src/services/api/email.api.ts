/**
 * Email API
 * Manages organization email accounts
 */

import { BaseApiClient } from './client';

export interface EmailRecord {
  id: string;
  email: string;
  password?: string;
  domain: string;
  organizationId?: string;
  organization?: { id: string; name: string; domain: string };
  provider: 'gmail' | 'outlook' | 'custom' | 'other';
  status: 'active' | 'inactive' | 'suspended';
  isPrimary: boolean;
  owner?: string;
  purpose?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type EmailPayload = Omit<EmailRecord, 'id' | 'organization' | 'createdAt' | 'updatedAt'>;

export class EmailApi extends BaseApiClient {
  async getEmails(): Promise<EmailRecord[]> {
    return this.request<EmailRecord[]>('/emails');
  }

  async createEmail(data: EmailPayload): Promise<EmailRecord> {
    return this.request<EmailRecord>('/emails', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmail(id: string, data: Partial<EmailPayload>): Promise<EmailRecord> {
    return this.request<EmailRecord>(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmail(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/emails/${id}`, {
      method: 'DELETE',
    });
  }
}
