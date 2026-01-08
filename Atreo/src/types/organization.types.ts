/**
 * Organization Types
 * Contains organization-related type definitions
 */

import type { User } from './auth.types';
import type { Tool } from './tool.types';
import type { Invoice } from './invoice.types';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  createdAt?: string;
  updatedAt?: string;
  userCount?: number;
  toolCount?: number;
  submissionCount?: number;
  invoiceCount?: number;
}

export interface OrganizationDetails {
  organization: Organization;
  users: User[];
  tools: Tool[];
  invoices: Invoice[];
}

export interface CreateOrganizationRequest {
  name: string;
  domain: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  domain: string;
}
