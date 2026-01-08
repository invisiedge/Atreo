/**
 * Base API wrapper for legacy axios-style helpers
 * Provides get/post/put/delete methods that return `{ data }` objects
 * while delegating the actual request handling to BaseApiClient.
 */

import { BaseApiClient } from './client';

type BodyPayload = BodyInit | object | undefined;

export class BaseApi extends BaseApiClient {
  protected async get<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { ...options, method: 'GET' });
    return { data };
  }

  protected async post<T>(endpoint: string, body?: BodyPayload, options: RequestInit = {}): Promise<{ data: T }> {
    const config: RequestInit = { ...options, method: 'POST' };
    if (body instanceof FormData) {
      config.body = body;
    } else if (body !== undefined) {
      config.body = JSON.stringify(body);
    }
    const data = await this.request<T>(endpoint, config);
    return { data };
  }

  protected async put<T>(endpoint: string, body?: BodyPayload, options: RequestInit = {}): Promise<{ data: T }> {
    const config: RequestInit = { ...options, method: 'PUT' };
    if (body instanceof FormData) {
      config.body = body;
    } else if (body !== undefined) {
      config.body = JSON.stringify(body);
    }
    const data = await this.request<T>(endpoint, config);
    return { data };
  }

  protected async patch<T>(endpoint: string, body?: BodyPayload, options: RequestInit = {}): Promise<{ data: T }> {
    const config: RequestInit = { ...options, method: 'PATCH' };
    if (body instanceof FormData) {
      config.body = body;
    } else if (body !== undefined) {
      config.body = JSON.stringify(body);
    }
    const data = await this.request<T>(endpoint, config);
    return { data };
  }

  protected async delete<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    return { data };
  }
}
