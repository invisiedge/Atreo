/**
 * Auth & Permissions Store (Zustand)
 * 
 * Centralized state management for authentication and permissions.
 * This replaces the AuthContext for better performance and simpler state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../services/api';
import { STORAGE_KEYS } from '../constants';
import { 
  hasModuleAccess as checkModuleAccess, 
  hasPageAccess as checkPageAccess, 
  hasAccessType as checkAccessType, 
  canAccessSettings as checkCanAccessSettings, 
  canAssignPermissions as checkCanAssignPermissions 
} from '../utils/permissions';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  
  // Permission helpers (computed from user state)
  hasModuleAccess: (module: string) => boolean;
  hasPageAccess: (module: string, page: string) => boolean;
  hasAccessType: (module: string, page: string, accessType?: 'read' | 'write') => boolean;
  canAccessSettings: () => boolean;
  canAssignPermissions: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        set({ user: null, error: null });
      },

      // Permission helpers
      hasModuleAccess: (module: string) => {
        const { user } = get();
        return checkModuleAccess(user, module);
      },

      hasPageAccess: (module: string, page: string) => {
        const { user } = get();
        return checkPageAccess(user, module, page);
      },

      hasAccessType: (module: string, page: string, accessType: 'read' | 'write' = 'read') => {
        const { user } = get();
        return checkAccessType(user, module, page, accessType);
      },

      canAccessSettings: () => {
        const { user } = get();
        return checkCanAccessSettings(user);
      },

      canAssignPermissions: () => {
        const { user } = get();
        return checkCanAssignPermissions(user);
      },
    }),
    {
      name: 'atreo-auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user, not loading/error states
    }
  )
);

