/**
 * Organization API
 * Handles organization-related API calls
 */

import type {
  Organization,
  OrganizationDetails,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class OrganizationApi extends BaseApiClient {
  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>(API_ENDPOINTS.ORGANIZATIONS.BASE);
  }

  async getOrganizationById(id: string): Promise<OrganizationDetails> {
    return this.request<OrganizationDetails>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id));
  }

  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    return this.request<Organization>(API_ENDPOINTS.ORGANIZATIONS.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    return this.request<Organization>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id), {
      method: 'DELETE',
    });
  }

  async getOrganizationDetails(id: string): Promise<OrganizationDetails> {
    return this.request<OrganizationDetails>(`/organizations/${id}/details`);
  }

  async addUserToOrganization(orgId: string, userId: string): Promise<OrganizationDetails> {
    return this.request<OrganizationDetails>(`/organizations/${orgId}/users/${userId}`, {
      method: 'POST',
    });
  }

  async removeUserFromOrganization(orgId: string, userId: string): Promise<OrganizationDetails> {
    return this.request<OrganizationDetails>(`/organizations/${orgId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async addToolToOrganization(orgId: string, toolId: string): Promise<OrganizationDetails> {
    return this.request<OrganizationDetails>(`/organizations/${orgId}/tools/${toolId}`, {
      method: 'POST',
    });
  }

  async removeToolFromOrganization(orgId: string, toolId: string): Promise<OrganizationDetails> {
    return this.request<OrganizationDetails>(`/organizations/${orgId}/tools/${toolId}`, {
      method: 'DELETE',
    });
  }
}
