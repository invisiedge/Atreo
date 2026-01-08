/**
 * Customers API Client
 * Handles customer management operations
 */

import { BaseApi } from './base.api';

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  status: 'active' | 'inactive' | 'prospect' | 'churned';
  customerType: 'individual' | 'business' | 'enterprise';
  tags: string[];
  notes?: string;
  totalRevenue: number;
  lastContactDate?: string;
  acquisitionDate: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  status?: 'active' | 'inactive' | 'prospect' | 'churned';
  customerType?: 'individual' | 'business' | 'enterprise';
  tags?: string[];
  notes?: string;
  assignedTo?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  totalRevenue?: number;
  lastContactDate?: string;
}

export interface CustomersResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  status?: string;
  customerType?: string;
  search?: string;
  assignedTo?: string;
}

export interface CustomerStats {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    prospects: number;
    churned: number;
  };
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  revenue: {
    total: number;
    average: number;
  };
}

export class CustomersApi extends BaseApi {
  /**
   * Get all customers with filtering
   */
  async getCustomers(filters: CustomerFilters = {}): Promise<CustomersResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await this.get<CustomersResponse>(`/customers?${params.toString()}`);
    return response.data;
  }

  /**
   * Get specific customer
   */
  async getCustomer(id: string): Promise<{ customer: Customer }> {
    const response = await this.get<{ customer: Customer }>(`/customers/${id}`);
    return response.data;
  }

  /**
   * Create new customer
   */
  async createCustomer(data: CreateCustomerRequest): Promise<{ message: string; customer: Customer }> {
    const response = await this.post<{ message: string; customer: Customer }>('/customers', data);
    return response.data;
  }

  /**
   * Update customer
   */
  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<{ message: string; customer: Customer }> {
    const response = await this.put<{ message: string; customer: Customer }>(`/customers/${id}`, data);
    return response.data;
  }

  /**
   * Delete customer
   */
  async deleteCustomer(id: string): Promise<{ message: string }> {
    const response = await this.delete<{ message: string }>(`/customers/${id}`);
    return response.data;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<CustomerStats> {
    const response = await this.get<CustomerStats>('/customers/stats/summary');
    return response.data;
  }
}
