/**
 * Formatters Utility
 * Contains formatting helper functions
 */

import { DATE_FORMATS, CURRENCY } from '@/constants';

/**
 * Format currency value
 */
export function formatCurrency(amount: number, currency: string = CURRENCY.DEFAULT, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format date to display format
 */
export function formatDate(date: string | Date, format: string = DATE_FORMATS.DISPLAY): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Simple format implementation
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'MMM DD, YYYY') {
    return `${month} ${day}, ${year}`;
  }

  if (format === 'YYYY-MM-DD') {
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${monthNum}-${day}`;
  }

  return d.toLocaleDateString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(d);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
