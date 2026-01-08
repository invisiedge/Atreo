/**
 * Permissions Constants
 * Contains permission module definitions
 */

export const PERMISSION_MODULES = [
  {
    id: 'general',
    label: 'General',
    options: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'settings', label: 'Settings' },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    options: [
      { id: 'employees', label: 'Employees' },
      { id: 'admins', label: 'Admins' },
      { id: 'users', label: 'Users' },
      { id: 'organizations', label: 'Organizations' },
      { id: 'customers', label: 'Customers' },
    ],
  },
  {
    id: 'requests',
    label: 'Requests',
    options: [
      { id: 'submission', label: 'Payroll Submission' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Resources',
    options: [
      { id: 'tools', label: 'Tools' },
      { id: 'credentials', label: 'Credentials' },
      { id: 'assets', label: 'Assets' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    options: [
      { id: 'payroll', label: 'Payroll' },
      { id: 'invoices', label: 'Invoices' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    options: [
      { id: 'analytics', label: 'Analytics' },
      { id: 'ai', label: 'AI Features' },
      { id: 'automation', label: 'Automation' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    options: [
      { id: 'messages', label: 'Messages' },
      { id: 'emails', label: 'Emails' },
      { id: 'domains', label: 'Domains' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    options: [
      { id: 'security', label: 'Security' },
      { id: 'logs', label: 'Logs' },
      { id: 'help', label: 'Help' },
    ],
  },
] as const;

export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: 'canManageUsers',
  MANAGE_EMPLOYEES: 'canManageEmployees',
  MANAGE_ADMINS: 'canManageAdmins',
  MANAGE_PAYROLL: 'canManagePayroll',
  VIEW_REPORTS: 'canViewReports',
  EXPORT_DATA: 'canExportData',
} as const;
