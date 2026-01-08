/**
 * TanStack Query hooks for Users
 *
 * Centralized data fetching for users.
 * Never call APIs directly in components - always use these hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import type { User } from '../../services/api';
import { QUERY } from '@/constants';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: { role?: string; status?: string }) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Get all users
 */
export function useUsers(filters?: { role?: string; status?: string }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      // Map frontend status to backend expected values
      // When status is undefined or 'all', show all users (both active and inactive)
      const statusParam = filters?.status === 'all' || !filters?.status ? 'all' : filters.status;
      const response = await apiClient.getUsers({
        role: filters?.role || undefined,
        status: statusParam
      });
      return response.users;
    },
    staleTime: QUERY.STALE_TIME,
  });
}

/**
 * Clear all users mutation
 */
export function useClearAllUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await apiClient.clearAllUsers();
    },
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Get single user by ID
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const response = await apiClient.getUsers();
      return response.users.find(u => u.id === userId);
    },
    enabled: !!userId,
  });
}

/**
 * Create user mutation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      name: string;
      email: string;
      password: string;
      role?: 'admin' | 'user';
      employeeId?: string;
      permissions?: string[];
    }) => {
      return await apiClient.createUser(userData);
    },
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Update user mutation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> }) => {
      // Handle different update types
      if (data.role !== undefined) {
        await apiClient.updateUserRole(userId, data.role);
      }
      if (data.isActive !== undefined) {
        await apiClient.updateUserStatus(userId, data.isActive);
      }
      if (data.permissions !== undefined) {
        await apiClient.updateUserPermissions(userId, data.permissions);
      }
      return { userId, data };
    },
    onSuccess: (variables) => {
      // Invalidate users list and specific user detail
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
    },
  });
}

/**
 * Delete user mutation
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return await apiClient.deleteUser(userId);
    },
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

