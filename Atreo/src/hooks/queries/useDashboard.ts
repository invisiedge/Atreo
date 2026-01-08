/**
 * TanStack Query hooks for Dashboard
 * 
 * Centralized data fetching for dashboard statistics.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  admin: (timeFrame?: string) => [...dashboardKeys.all, 'admin', timeFrame] as const,
  user: () => [...dashboardKeys.all, 'user'] as const,
};

/**
 * Get admin dashboard stats
 */
export function useAdminDashboardStats(timeFrame?: '1month' | '3months' | '6months' | '1year') {
  return useQuery({
    queryKey: dashboardKeys.admin(timeFrame),
    queryFn: async () => {
      return await apiClient.getDashboardStats(timeFrame);
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get user dashboard stats
 */
export function useUserDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.user(),
    queryFn: async () => {
      return await apiClient.getUserDashboardStats();
    },
    staleTime: 60000, // 1 minute
  });
}
