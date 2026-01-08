/**
 * TanStack Query hooks for Tools
 * 
 * Centralized data fetching for tools.
 * Never call APIs directly in components - always use these hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import type { Tool } from '../../services/api';

// Query keys
export const toolKeys = {
  all: ['tools'] as const,
  lists: () => [...toolKeys.all, 'list'] as const,
  list: (filters?: { category?: string; status?: string }) => [...toolKeys.lists(), filters] as const,
  details: () => [...toolKeys.all, 'detail'] as const,
  detail: (id: string) => [...toolKeys.details(), id] as const,
  shared: () => [...toolKeys.all, 'shared'] as const,
};

/**
 * Get all tools
 */
export function useTools(filters?: { category?: string; status?: string }) {
  return useQuery({
    queryKey: toolKeys.list(filters),
    queryFn: async () => {
      const tools = await apiClient.getTools();
      // Apply client-side filtering if needed
      let filtered = tools;
      if (filters?.category && filters.category !== 'all') {
        filtered = filtered.filter(t => t.category === filters.category);
      }
      if (filters?.status) {
        filtered = filtered.filter(t => t.status === filters.status);
      }
      return filtered;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get single tool by ID
 */
export function useTool(toolId: string) {
  return useQuery({
    queryKey: toolKeys.detail(toolId),
    queryFn: async () => {
      return await apiClient.getToolById(toolId);
    },
    enabled: !!toolId,
  });
}

/**
 * Create tool mutation
 */
export function useCreateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolData: Partial<Tool>) => {
      return await apiClient.createTool(toolData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolKeys.lists() });
    },
  });
}

/**
 * Update tool mutation
 */
export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toolId, data }: { toolId: string; data: Partial<Tool> }) => {
      return await apiClient.updateTool(toolId, data);
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: toolKeys.lists() });
      queryClient.invalidateQueries({ queryKey: toolKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete tool mutation
 */
export function useDeleteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string) => {
      return await apiClient.deleteTool(toolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolKeys.lists() });
    },
  });
}

