import { logger } from '../lib/logger';
import { apiClient } from './api';
import type { DashboardStats } from '../types/dashboard.types';

export interface UserDashboardStats {
  totalEarnings: number;
  pendingRequests: number;
  approvedRequests: number;
}

export class DashboardService {
  static async getAdminStats(timeFrame?: '1month' | '3months' | '6months' | '1year'): Promise<DashboardStats> {
    try {
      return await apiClient.getDashboardStats(timeFrame);
    } catch (error) {
      logger.error('Failed to fetch admin dashboard stats:', error);
      throw error;
    }
  }

  static async getUserStats(): Promise<UserDashboardStats> {
    try {
      return await apiClient.getUserDashboardStats();
    } catch (error) {
      logger.error('Failed to fetch user dashboard stats:', error);
      throw error;
    }
  }
}
