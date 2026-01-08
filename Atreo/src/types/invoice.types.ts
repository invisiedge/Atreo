/**
 * Invoice Types
 * Contains invoice-related type definitions
 */

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  provider: string;
  billingDate: string;
  dueDate?: string | null;
  category?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  organizationId?: string;
  toolIds?: string[];
  tools?: Array<{
    id: string;
    name: string;
  }>;
  organization?: {
    id: string;
    name: string;
    domain: string;
  };
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  };
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  invoiceNumber: string;
  amount: number;
  provider: string;
  billingDate: string;
  dueDate?: string;
  category?: string;
  organizationId?: string;
  toolIds?: string[];
  file?: File;
}

export interface UpdateInvoiceRequest {
  invoiceNumber?: string;
  amount?: number;
  provider?: string;
  billingDate?: string;
  dueDate?: string;
  category?: string;
  organizationId?: string;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  pendingInvoices: number;
  pendingAmount: number;
  approvedInvoices: number;
  approvedAmount: number;
  rejectedInvoices: number;
  rejectedAmount: number;
  averageInvoiceAmount: number;
  currency: string;
}
