/**
 * Messages API Client
 * Handles internal messaging system
 */

import { BaseApi } from './base.api';

export interface Message {
  _id: string;
  from: {
    _id: string;
    name: string;
    email: string;
  };
  to: {
    _id: string;
    name: string;
    email: string;
  };
  subject: string;
  content: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'payroll' | 'hr' | 'it' | 'announcement';
  attachments?: Array<{
    filename: string;
    path: string;
    size: number;
  }>;
  readAt?: string;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount?: number;
}

export interface SendMessageRequest {
  to: string;
  subject: string;
  content: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: 'general' | 'payroll' | 'hr' | 'it' | 'announcement';
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  unread?: boolean;
  category?: string;
  priority?: string;
}

export interface MessageStats {
  totalReceived: number;
  unreadCount: number;
  totalSent: number;
  priorityBreakdown: Record<string, number>;
}

export class MessagesApi extends BaseApi {
  /**
   * Get inbox messages
   */
  async getMessages(filters: MessageFilters = {}): Promise<MessagesResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await this.get<MessagesResponse>(`/messages?${params.toString()}`);
    return response.data;
  }

  /**
   * Get sent messages
   */
  async getSentMessages(page = 1, limit = 20): Promise<MessagesResponse> {
    const response = await this.get<MessagesResponse>(`/messages/sent?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Get specific message
   */
  async getMessage(id: string): Promise<{ message: Message }> {
    const response = await this.get<{ message: Message }>(`/messages/${id}`);
    return response.data;
  }

  /**
   * Send new message
   */
  async sendMessage(data: SendMessageRequest): Promise<{ message: string; messageData: Message }> {
    const response = await this.post<{ message: string; messageData: Message }>('/messages', data);
    return response.data;
  }

  /**
   * Mark message as read
   */
  async markAsRead(id: string): Promise<{ message: string }> {
    const response = await this.put<{ message: string }>(`/messages/${id}/read`);
    return response.data;
  }

  /**
   * Delete message
   */
  async deleteMessage(id: string): Promise<{ message: string }> {
    const response = await this.delete<{ message: string }>(`/messages/${id}`);
    return response.data;
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<MessageStats> {
    const response = await this.get<MessageStats>('/messages/stats/summary');
    return response.data;
  }
}
