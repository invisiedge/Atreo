/**
 * Routes Configuration
 * Centralized routing configuration for the application
 */

export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  children?: RouteConfig[];
}

/**
 * Admin Routes
 */
export const ADMIN_ROUTES = {
  // Dashboard
  DASHBOARD: '/admin/dashboard',

  // Management
  EMPLOYEES: '/admin/employees',
  USERS: '/admin/users',
  ADMINS: '/admin/admins',
  ORGANIZATIONS: '/admin/organizations',
  CUSTOMERS: '/admin/customers',

  // Tools & Resources
  TOOLS: '/admin/tools',
  CREDENTIALS: '/admin/credentials',
  ASSETS: '/admin/assets',

  // Financial
  PAYROLL: '/admin/payroll',
  INVOICES: '/admin/invoices',
  INVOICE_CREATE: '/admin/invoices/create',

  // Intelligence
  ANALYTICS: '/admin/analytics',
  AI_FEATURES: '/admin/ai-features',
  AUTOMATION: '/admin/automation',

  // Communication
  MESSAGES: '/admin/messages',
  EMAILS: '/admin/emails',
  DOMAINS: '/admin/domains',

  // System
  SETTINGS: '/admin/settings',
  SECURITY: '/admin/security',
  LOGS: '/admin/logs',
  HELP: '/admin/help',
} as const;

/**
 * User Routes
 */
export const USER_ROUTES = {
  DASHBOARD: '/user/dashboard',
  PROFILE: '/user/profile',
  SUBMISSION: '/user/submission',
  TOOLS: '/user/tools',
  SETTINGS: '/user/settings',
} as const;

/**
 * Auth Routes
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
} as const;

/**
 * Public Routes (no authentication required)
 */
export const PUBLIC_ROUTES = [
  AUTH_ROUTES.LOGIN,
  AUTH_ROUTES.SIGNUP,
] as string[];

/**
 * Admin Role Routes (requires admin role)
 */
export const ADMIN_ROLE_ROUTES = Object.values(ADMIN_ROUTES) as string[];

/**
 * User Role Routes (requires user role)
 */
export const USER_ROLE_ROUTES = Object.values(USER_ROUTES) as string[];

/**
 * All Routes
 */
export const ALL_ROUTES = {
  ...ADMIN_ROUTES,
  ...USER_ROUTES,
  ...AUTH_ROUTES,
} as const;

/**
 * Get route by user role
 */
export function getDefaultRoute(role: 'admin' | 'user'): string {
  return role === 'admin' ? ADMIN_ROUTES.DASHBOARD : USER_ROUTES.DASHBOARD;
}

/**
 * Check if route is accessible by role
 */
export function canAccessRoute(route: string, role: 'admin' | 'user'): boolean {
  if (PUBLIC_ROUTES.includes(route)) return true;

  if (role === 'admin') {
    return ADMIN_ROLE_ROUTES.includes(route);
  }

  if (role === 'user') {
    return USER_ROLE_ROUTES.includes(route);
  }

  return false;
}
