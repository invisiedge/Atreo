/**
 * AI Assistant API
 */

import { BaseApiClient } from './client';
import { AI_API_TIMEOUT, STORAGE_KEYS } from '@/constants';
import { logger } from '@/lib/logger';

export class AiApi extends BaseApiClient {
  async ask(question: string): Promise<{ answer: string }> {
    const url = `${this.baseURL}/ai/ask`;
    const currentToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    // Use longer timeout for AI requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_API_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch {
          errorData = {};
        }
        
        logger.error('AI API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          errorData: errorData
        });

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
      clearTimeout(timeoutId);
      logger.error('AI API request failed:', error);

      // Handle timeout errors
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message?.includes('aborted'))
      ) {
        const timeoutError = new Error(
          'AI request timed out. The AI is processing a large amount of data. Please try a more specific question or try again in a moment.'
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      // Re-throw other errors
      throw error;
    }
  }
}
