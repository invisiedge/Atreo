/**
 * Admin Types
 * Contains admin-related type definitions
 */

export interface Admin {
  id: string;
  userId: string;
  adminId: string;
  name: string;
  email: string;
  role: 'admin' | 'super-admin';
  permissions: {
    canManageUsers: boolean;
    canManageEmployees: boolean;
    canManageAdmins: boolean;
    canManagePayroll: boolean;
    canViewReports: boolean;
    canExportData: boolean;
  };
  status: 'active' | 'inactive' | 'suspended';
  department?: string;
  phone?: string;
  lastLogin?: string;
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

export interface CreateAdminRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'super-admin';
  department?: string;
  phone?: string;
  permissions?: {
    canManageUsers: boolean;
    canManageEmployees: boolean;
    canManageAdmins: boolean;
    canManagePayroll: boolean;
    canViewReports: boolean;
    canExportData: boolean;
  };
}

export interface UpdateAdminRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'super-admin';
  department?: string;
  phone?: string;
  permissions?: {
    canManageUsers: boolean;
    canManageEmployees: boolean;
    canManageAdmins: boolean;
    canManagePayroll: boolean;
    canViewReports: boolean;
    canExportData: boolean;
  };
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}
