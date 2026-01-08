/**
 * Audit Logs API Client
 * Handles audit log viewing and management
 */

import { BaseApi } from './base.api';

export interface AuditLog {
  id: string;
  action: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface LogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LogsFilters {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  resourceType?: string;
  status?: string;
  search?: string;
}

export interface LogStats {
  summary: {
    totalLogs: number;
    logsLast24Hours: number;
    logsLast7Days: number;
    logsLast30Days: number;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topUsers: Array<{
    user: {
      name: string;
      email: string;
    };
    count: number;
  }>;
}

export class LogsApi extends BaseApi {
  /**
   * Get audit logs with filtering
   */
  async getLogs(filters: LogsFilters = {}): Promise<LogsResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await this.get<LogsResponse>(`/logs?${params.toString()}`);
    return response.data;
  }

  /**
   * Get specific audit log
   */
  async getLog(id: string): Promise<{ log: AuditLog }> {
    const response = await this.get<{ log: AuditLog }>(`/logs/${id}`);
    return response.data;
  }

  /**
   * Get audit log statistics
   */
  async getLogStats(): Promise<LogStats> {
    const response = await this.get<LogStats>('/logs/stats/summary');
    return response.data;
  }

  /**
   * Clean up old audit logs
   */
  async cleanupLogs(days = 90): Promise<{ message: string; deletedCount: number }> {
    const response = await this.delete<{ message: string; deletedCount: number }>(`/logs/cleanup?days=${days}`);
    return response.data;
  }
}
