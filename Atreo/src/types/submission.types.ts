/**
 * Submission Types
 * Contains submission/payroll request-related type definitions
 */

export interface Submission {
  id: string;
  employeeName: string;
  employeeId: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    fullAccountNumber: string;
    swiftCode: string;
  };
  workPeriod: string;
  description: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  invoiceNumber?: string;
  reviewerName?: string;
  rejectionReason?: string;
}

export interface CreateSubmissionRequest {
  bankName: string;
  accountNumber: string;
  swiftCode: string;
  workPeriod: string;
  description: string;
  totalAmount: number;
}
