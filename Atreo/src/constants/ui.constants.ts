/**
 * UI Constants
 * Contains timeouts, delays, and other UI-related magic numbers
 */

/**
 * Timeouts (in milliseconds)
 */
export const TIMEOUTS = {
  /** Toast notification auto-dismiss duration */
  TOAST: 4000,
  /** API request timeout */
  API_REQUEST: 30000,
  /** Invoice parsing timeout (1 minute) */
  INVOICE_PARSE: 60000,
  /** Debounce delay for search inputs */
  SEARCH_DEBOUNCE: 300,
  /** Auto-refresh interval for dashboard */
  AUTO_REFRESH: 30000,
} as const;

/**
 * Pagination
 */
export const UI_PAGINATION = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 10,
  /** Available page size options */
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

/**
 * File Upload
 */
export const FILE_UPLOAD = {
  /** Max file size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** Allowed invoice file types */
  INVOICE_FILE_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] as string[],
  /** Allowed invoice file extensions */
  INVOICE_FILE_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png'] as string[],
  /** Allowed Excel file types */
  EXCEL_FILE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ] as string[],
  /** Allowed Excel file extensions */
  EXCEL_FILE_EXTENSIONS: ['.xlsx', '.xls', '.csv'] as string[],
} as const;

/**
 * Validation
 */
export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 6,
  /** Maximum file name length */
  MAX_FILE_NAME_LENGTH: 255,
  /** Minimum search query length */
  MIN_SEARCH_LENGTH: 2,
} as const;

/**
 * React Query / TanStack Query
 */
export const QUERY = {
  /** Stale time for cached data (30 seconds) */
  STALE_TIME: 30000,
  /** Cache time for inactive queries (5 minutes) */
  CACHE_TIME: 5 * 60 * 1000,
  /** Retry attempts for failed queries */
  RETRY_ATTEMPTS: 3,
} as const;
