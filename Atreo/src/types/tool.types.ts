/**
 * Tool Types
 * Contains tool/resource-related type definitions
 */

export interface Tool {
  id: string;
  name: string;
  description?: string;
  category?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  notes?: string;
  tags?: string[];
  isPaid?: boolean;
  hasAutopay?: boolean;
  price?: number;
  billingPeriod?: 'monthly' | 'yearly';
  has2FA?: boolean;
  twoFactorMethod?: 'mobile' | 'email' | null;
  paymentMethod?: 'card' | 'bank' | 'paypal' | 'other' | null;
  cardLast4Digits?: string;
  createdBy?: string;
  status?: 'active' | 'inactive';
  isShared?: boolean;
  sharedBy?: {
    id: string;
    name: string;
    email: string;
  };
  permission?: 'view' | 'edit';
}
