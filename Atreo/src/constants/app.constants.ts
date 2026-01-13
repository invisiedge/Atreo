/**
 * Application Constants
 * Contains application-wide constant values
 */

export const APP_NAME = 'Atreo';

export const APP_DESCRIPTION = 'Payroll Management System';

export const STORAGE_KEYS = {
  TOKEN: 'atreo_token',
  USER: 'atreo_user',
  THEME: 'atreo_theme',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  ACCOUNTANT: 'accountant',
} as const;

export const ADMIN_ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  ON_LEAVE: 'on-leave',
} as const;

export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const EMPLOYMENT_TYPES = {
  FULL_TIME: 'Full-time',
  INTERN: 'Intern',
  FREELANCER: 'Freelancer',
  CONSULTANT: 'Consultant',
} as const;

export const WORK_LOCATIONS = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  OFFICE: 'Office',
} as const;

export const SALARY_TYPES = {
  MONTHLY: 'Monthly',
  HOURLY: 'Hourly',
  PROJECT_BASED: 'Project-based',
} as const;

export const PAYROLL_CYCLES = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
} as const;

export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export const TWO_FACTOR_METHODS = {
  MOBILE: 'mobile',
  EMAIL: 'email',
} as const;

export const PAYMENT_METHODS = {
  CARD: 'card',
  BANK: 'bank',
  PAYPAL: 'paypal',
  OTHER: 'other',
} as const;

export const PERMISSION_LEVELS = {
  VIEW: 'view',
  EDIT: 'edit',
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
} as const;

export const CURRENCY = {
  DEFAULT: 'USD',
  SYMBOL: '$',
} as const;
export const APP_PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;
