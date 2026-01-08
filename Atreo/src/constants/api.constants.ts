/**
 * API Constants
 * Contains API configuration and endpoint definitions
 */

export const API_TIMEOUT = 30000; // 30 seconds
export const AI_API_TIMEOUT = 120000; // 2 minutes for AI requests (they take longer)

// Ensure API_BASE_URL is a valid absolute URL with protocol and /api suffix
const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Add protocol if missing (assume https for production, http for localhost)
let normalizedURL = rawBaseURL.trim();

// Remove trailing slashes first
normalizedURL = normalizedURL.replace(/\/+$/, '');

if (!normalizedURL.startsWith('http://') && !normalizedURL.startsWith('https://')) {
  // If no protocol, add https:// (or http:// for localhost)
  if (normalizedURL.includes('localhost') || normalizedURL.includes('127.0.0.1')) {
    normalizedURL = `http://${normalizedURL}`;
  } else {
    normalizedURL = `https://${normalizedURL}`;
  }
}

// Ensure it ends with /api (but not /api/)
export const API_BASE_URL = normalizedURL.endsWith('/api') 
  ? normalizedURL 
  : normalizedURL.endsWith('/api/')
  ? normalizedURL.slice(0, -1)
  : `${normalizedURL}/api`;

// Log in both development and production to help debug
console.log('🔧 API Configuration:', {
  API_BASE_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '(not set)',
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV
});

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    PROFILE: '/auth/profile',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: (id: string) => `/users/${id}/profile`,
  },

  // Employees
  EMPLOYEES: {
    BASE: '/employees',
    BY_ID: (id: string) => `/employees/${id}`,
  },

  // Admins
  ADMINS: {
    BASE: '/admins',
    BY_ID: (id: string) => `/admins/${id}`,
  },

  // Submissions
  SUBMISSIONS: {
    BASE: '/submissions',
    BY_ID: (id: string) => `/submissions/${id}`,
    APPROVE: (id: string) => `/submissions/${id}/approve`,
    REJECT: (id: string) => `/submissions/${id}/reject`,
    MY: '/submissions/my',
  },

  // Organizations
  ORGANIZATIONS: {
    BASE: '/organizations',
    BY_ID: (id: string) => `/organizations/${id}`,
    DETAILS: (id: string) => `/organizations/${id}/details`,
    ADD_USER: (orgId: string, userId: string) => `/organizations/${orgId}/users/${userId}`,
    REMOVE_USER: (orgId: string, userId: string) => `/organizations/${orgId}/users/${userId}`,
    ADD_TOOL: (orgId: string, toolId: string) => `/organizations/${orgId}/tools/${toolId}`,
    REMOVE_TOOL: (orgId: string, toolId: string) => `/organizations/${orgId}/tools/${toolId}`,
  },

  // Tools
  TOOLS: {
    BASE: '/tools',
    BY_ID: (id: string) => `/tools/${id}`,
    SHARE: '/tools/share',
  },

  // Invoices
  INVOICES: {
    BASE: '/invoices',
    BY_ID: (id: string) => `/invoices/${id}`,
    PARSE: '/invoices/parse',
    APPROVE: (id: string) => `/invoices/${id}/approve`,
    REJECT: (id: string) => `/invoices/${id}/reject`,
    DOWNLOAD: (id: string) => `/invoices/${id}/download`,
    SUMMARY: '/invoices/summary',
    IMPORT_EXCEL: '/invoices/import/excel',
  },

  // Dashboard
  DASHBOARD: {
    ADMIN: '/dashboard/stats',
    USER: '/dashboard/user-stats',
  },

  // Payments
  PAYMENTS: {
    BASE: '/payments',
    IMPORT_EXCEL: '/payments/import-excel',
  },
} as const;

export const API_CONFIG = {
  apiBaseUrl: API_BASE_URL,
  isDevelopment:
    API_BASE_URL.includes('localhost') ||
    API_BASE_URL.includes('127.0.0.1') ||
    API_BASE_URL.startsWith('http://localhost') ||
    import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
