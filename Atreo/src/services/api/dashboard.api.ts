/**
 * Dashboard API
 * Handles dashboard statistics API calls
 */

import type { DashboardStats, UserDashboardStats } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class DashboardApi extends BaseApiClient {
  async getDashboardStats(timeFrame?: '1month' | '3months' | '6months' | '1year'): Promise<DashboardStats> {
    const queryParams = timeFrame ? `?timeFrame=${timeFrame}` : '';
    return this.request<DashboardStats>(`${API_ENDPOINTS.DASHBOARD.ADMIN}${queryParams}`);
  }

  async getUserDashboardStats(): Promise<UserDashboardStats> {
    return this.request<UserDashboardStats>(API_ENDPOINTS.DASHBOARD.USER);
  }
}

