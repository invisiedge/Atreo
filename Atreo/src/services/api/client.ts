/**
 * Base API Client
 * Provides core HTTP request functionality
 */

import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from '@/constants';
import { logger } from '@/lib/logger';

export class BaseApiClient {
  protected baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Normalize URL construction - ensure no double slashes
    const base = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${base}${path}`;

    // Refresh token from localStorage for each request
    const currentToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
    const isFormData = options.body instanceof FormData;

    // Build headers - ensure Authorization is always included if token exists
    const headers: HeadersInit = {};
    
    // Add Content-Type only if not FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Always add Authorization if token exists (even for FormData)
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    // Merge any additional headers from options (but don't override Authorization)
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'authorization') {
          headers[key] = value as string;
        }
      });
    }

    const opts = options as RequestInit & { timeout?: number };
    const timeoutMs = opts.timeout ?? API_TIMEOUT;
    const { timeout: _skip, ...restOptions } = opts;
    const config: RequestInit = {
      ...restOptions,
      headers,
    };

    try {
      // Add timeout for fetch requests (allow per-request override for long operations e.g. Excel import)
      let controller: AbortController | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const fetchConfig = { ...config };

      if (!fetchConfig.signal) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller!.abort(), timeoutMs);
        fetchConfig.signal = controller.signal;
      }

      const response = await fetch(url, fetchConfig);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch {
          // If JSON parsing fails, use empty object
          errorData = {};
        }
        
        logger.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          errorData: errorData
        });

        // Handle token expiration (401 Unauthorized)
        if (response.status === 401) {
          const errorCode = (errorData as { code?: string })?.code;
          if (errorCode === 'TOKEN_EXPIRED' || (errorData as { message?: string })?.message?.toLowerCase().includes('expired')) {
            // Clear token from localStorage
            const STORAGE_KEYS = { TOKEN: 'token', USER: 'user' };
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(STORAGE_KEYS.TOKEN);
              localStorage.removeItem(STORAGE_KEYS.USER);
            }
            const expiredError = new Error(
              (errorData as { message?: string })?.message || 'Your session has expired. Please log in again.'
            );
            (expiredError as Error & { status: number; code: string; response: { data: Record<string, unknown> } }).status = 401;
            (expiredError as Error & { status: number; code: string; response: { data: Record<string, unknown> } }).code = 'TOKEN_EXPIRED';
            (expiredError as Error & { status: number; code: string; response: { data: Record<string, unknown> } }).response = { data: errorData };
            throw expiredError;
          }
        }

        // Handle permission denied (403 Forbidden)
        // This happens when sidebar shows item but backend blocks access
        if (response.status === 403) {
          const permissionError = new Error(
            (errorData as { message?: string })?.message || 'Access denied. You do not have permission to perform this action.'
          );
          (permissionError as Error & { status: number; code: string; response: { data: Record<string, unknown> } }).status = 403;
          (permissionError as Error & { status: number; code: string; response: { data: Record<string, unknown> } }).code = 'PERMISSION_DENIED';
          (permissionError as Error & { status: number; code: string; response: { data: Record<string, unknown> } }).response = { data: errorData };
          throw permissionError;
        }

        // Handle rate limiting (429 Too Many Requests)
        if (response.status === 429) {
          const rateLimitError = new Error(
            (errorData as { message?: string })?.message || 'Too many requests'
          );
          (rateLimitError as Error & { status: number; retryAfter?: unknown; response: { data: Record<string, unknown> } }).status = 429;
          (rateLimitError as Error & { status: number; retryAfter?: unknown; response: { data: Record<string, unknown> } }).retryAfter = (errorData as { retryAfter?: unknown })?.retryAfter;
          (rateLimitError as Error & { status: number; retryAfter?: unknown; response: { data: Record<string, unknown> } }).response = { data: errorData };
          throw rateLimitError;
        }

        const httpError = new Error(
          (errorData as { message?: string })?.message || `HTTP error! status: ${response.status}`
        );
        (httpError as Error & { status: number; response: { data: Record<string, unknown> } }).status = response.status;
        (httpError as Error & { status: number; response: { data: Record<string, unknown> } }).response = { data: errorData };
        throw httpError;
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      logger.error('API request failed:', error);

      // Handle timeout errors
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message?.includes('aborted'))
      ) {
        const timeoutError = new Error(
          'Request timed out. The server is taking too long to respond. ' +
          'Please check your internet connection and try again.'
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      // Provide more specific error messages for common fetch errors
      if (
        error instanceof Error &&
        error.name === 'TypeError' &&
        error.message === 'Failed to fetch'
      ) {
        const isCorsError = error.message.includes('CORS') ||
                           error.message.includes('Access-Control') ||
                           (typeof error.cause !== 'undefined');

        const isDevelopment = API_BASE_URL.includes('localhost') ||
                              API_BASE_URL.includes('127.0.0.1') ||
                              API_BASE_URL.startsWith('http://localhost') ||
                              import.meta.env.DEV;

        let errorMessage: string;
        if (isCorsError) {
          errorMessage = 'Connection blocked by browser security settings. This might be due to:\n' +
            '1. CORS configuration issue\n' +
            '2. Browser extensions blocking requests\n' +
            '3. Corporate firewall or proxy settings\n\n' +
            'Please try disabling browser extensions or contact your IT administrator.';
        } else if (isDevelopment) {
          errorMessage = 'Unable to connect to the server. Please check:\n' +
            '1. Backend server is running on port 3001\n' +
            '2. CORS is properly configured\n' +
            '3. Network connection is active';
        } else {
          errorMessage = 'Unable to connect to the server. This could be due to:\n' +
            '1. Network connectivity issues\n' +
            '2. Browser security settings or extensions\n' +
            '3. Server temporarily unavailable\n\n' +
            'Please check your internet connection, try disabling browser extensions, or refresh the page.';
        }

        const networkError = new Error(errorMessage);
        networkError.name = 'NetworkError';
        throw networkError;
      }

      // Re-throw the error if it's already a proper Error object
      if (error instanceof Error) {
        throw error;
      }

      // If it's something else, wrap it
      throw new Error((error as { message?: string })?.message || 'An unexpected error occurred');
    }
  }
}
