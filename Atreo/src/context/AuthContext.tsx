import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient, type User } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { logger } from '../lib/logger';
import { STORAGE_KEYS } from '../constants';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session on app load
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token) {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
          
          // Sync with Zustand store
          useAuthStore.getState().setUser(currentUser);
        } else {
          // No token, clear Zustand store
          useAuthStore.getState().setUser(null);
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error);
        // Clear invalid token
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        
        // Clear Zustand store
        useAuthStore.getState().setUser(null);
      } finally {
        setIsLoading(false);
        useAuthStore.getState().setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.login({ email, password });
      setUser(response.user);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      
      // Sync with Zustand store
      useAuthStore.getState().setUser(response.user);
      useAuthStore.getState().setLoading(false);
      
      return true;
    } catch (error: any) {
      logger.error('Login failed:', error);
      
      // Handle rate limiting error
      if (error.status === 429) {
        setError(error.message || 'Too many login attempts. Please wait before trying again.');
      } else {
        setError(error instanceof Error ? error.message : 'Login failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      
      // Sync with Zustand store
      useAuthStore.getState().logout();
    }
  };

  // Sync setUser with Zustand store
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    useAuthStore.getState().setUser(newUser);
  };

  const value = {
    user,
    setUser: handleSetUser,
    login,
    logout,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
