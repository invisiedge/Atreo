/**
 * Logger Utility
 * Environment-aware logging that only outputs in development
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logging - only in development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logging - only in development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logging - always shown
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logging - always shown, but sanitized
   */
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error('[ERROR]', message, error);
    } else {
      // Production: only log message, not full error object
      console.error('[ERROR]', message);
    }
  },

  /**
   * Group logging for related logs - only in development
   */
  group: (label: string, callback: () => void) => {
    if (isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  },
};
