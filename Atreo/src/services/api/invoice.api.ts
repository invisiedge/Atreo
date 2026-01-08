/**
 * Invoice API
 * Handles invoice-related API calls
 */

import type { Invoice, CreateInvoiceRequest, UpdateInvoiceRequest, InvoiceSummary } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class InvoiceApi extends BaseApiClient {
  async getInvoices(filters?: {
    status?: string;
    provider?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Invoice[]> {
    let url = API_ENDPOINTS.INVOICES.BASE;

    // Add query parameters if filters provided
    if (filters) {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.provider) params.append('provider', filters.provider);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<Invoice[]>(url);
  }

  async parseInvoice(file: File): Promise<{
    invoiceNumber?: string;
    amount?: number;
    provider?: string;
    billingDate?: string;
    category?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    // Don't pass headers: {} - it will override the Authorization header
    // BaseApiClient will handle FormData correctly (won't set Content-Type, but will keep Authorization)
    return this.request<{
      invoiceNumber?: string;
      amount?: number;
      provider?: string;
      billingDate?: string;
      category?: string;
    }>(API_ENDPOINTS.INVOICES.PARSE, {
      method: 'POST',
      body: formData,
      // Don't pass headers - let BaseApiClient handle it
    });
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    const formData = new FormData();
    formData.append('invoiceNumber', data.invoiceNumber);
    formData.append('amount', data.amount.toString());
    formData.append('provider', data.provider);
    formData.append('billingDate', data.billingDate);
    if (data.dueDate) formData.append('dueDate', data.dueDate);
    if (data.category) formData.append('category', data.category);
    if (data.organizationId) formData.append('organizationId', data.organizationId);
    if (data.toolIds && data.toolIds.length > 0) {
      data.toolIds.forEach(toolId => {
        formData.append('toolIds', toolId);
      });
    }
    if (data.file) formData.append('file', data.file);

    return this.request<Invoice>(API_ENDPOINTS.INVOICES.BASE, {
      method: 'POST',
      body: formData,
      // Don't pass headers - BaseApiClient will handle FormData and Authorization correctly
    });
  }

  async updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<Invoice> {
    return this.request<Invoice>(API_ENDPOINTS.INVOICES.BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.INVOICES.BY_ID(id), {
      method: 'DELETE',
    });
  }

  async approveInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(API_ENDPOINTS.INVOICES.APPROVE(id), {
      method: 'POST',
    });
  }

  async rejectInvoice(id: string, reason: string): Promise<Invoice> {
    return this.request<Invoice>(API_ENDPOINTS.INVOICES.REJECT(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getInvoiceDownloadUrl(id: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(API_ENDPOINTS.INVOICES.DOWNLOAD(id));
  }

  async getInvoicesSummary(): Promise<InvoiceSummary> {
    return this.request<InvoiceSummary>(API_ENDPOINTS.INVOICES.SUMMARY);
  }

  async importExcel(file: File): Promise<{
    success: boolean;
    message: string;
    imported: number;
    skipped: number;
    errors: number;
    invoices: Invoice[];
    errorDetails: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{
      success: boolean;
      message: string;
      imported: number;
      skipped: number;
      errors: number;
      invoices: Invoice[];
      errorDetails: Array<{ row: number; error: string }>;
    }>(API_ENDPOINTS.INVOICES.IMPORT_EXCEL, {
      method: 'POST',
      body: formData,
      // Don't pass headers - BaseApiClient will handle FormData and Authorization correctly
    });
  }

  async clearAllInvoices(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/invoices/clear-all', {
      method: 'DELETE',
    });
  }
}
