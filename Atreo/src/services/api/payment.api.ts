/**
 * Payment API
 * Handles payment-related API calls
 */

import { BaseApiClient } from './client';

export interface Payment {
  id: string;
  month: string;
  name: string;
  role: string;
  contractHours: number;
  fulfilledHours: number;
  amount: number;
  currency: string;
  notes?: any;
  provider?: string;
  category?: string;
  invoiceNumber?: string;
  billingDate?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    domain: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ImportPaymentResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: number;
  payments: Payment[];
  errorDetails: Array<{ row: number; error: string }>;
}

export class PaymentApi extends BaseApiClient {
  async getPayments(): Promise<Payment[]> {
    return this.request<Payment[]>('/payments');
  }

  async createPayment(data: {
    name: string;
    amount: number;
    month: string;
    role?: string;
    contractHours?: number;
    fulfilledHours?: number;
  }): Promise<Payment> {
    return this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importExcel(file: File): Promise<ImportPaymentResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<ImportPaymentResult>('/payments/import-excel', {
      method: 'POST',
      body: formData,
    });
  }

  async clearAllPayments(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/payments/clear-all', {
      method: 'DELETE',
    });
  }
}

