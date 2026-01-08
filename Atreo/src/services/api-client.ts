/**
 * API Client (Legacy)
 * Re-exports from the new modular API structure for backward compatibility
 *
 * @deprecated Import from '@/services/api' instead
 */

// Re-export all types from centralized types directory
export type {
  User,
  UserProfile,
  UpdateUserProfileRequest,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  Submission,
  CreateSubmissionRequest,
  Employee,
  CreateEmployeeRequest,
  Admin,
  CreateAdminRequest,
  UpdateAdminRequest,
  Tool,
  Organization,
  OrganizationDetails,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
} from '@/types';

// Re-export the unified API client from the new modular structure
export { apiClient, config } from './api/index';
