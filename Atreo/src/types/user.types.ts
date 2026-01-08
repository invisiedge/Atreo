/**
 * User Profile Types
 * Contains user profile and related type definitions
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  employeeId?: string;
  phone?: string;
  address?: string;
  position?: string;
  department?: string;
  bankName?: string;
  accountNumber?: string;
  swiftCode?: string;
}

export interface UpdateUserProfileRequest {
  phone?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
  swiftCode?: string;
}
