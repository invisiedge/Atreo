/**
 * TanStack Query Provider
 * 
 * Wraps the app with React Query for server state management.
 * All server data fetching should go through TanStack Query hooks.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { logger } from '@/lib/logger';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

// Separate component for lazy loading devtools
function LazyDevTools() {
  const [DevTools, setDevTools] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('@tanstack/react-query-devtools')
      .then((mod) => {
        setDevTools(() => mod.ReactQueryDevtools);
      })
      .catch(() => {
        // Devtools not available, that's okay
        logger.debug('React Query Devtools not available');
      });
  }, []);

  if (!DevTools) return null;
  return <DevTools initialIsOpen={false} />;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <LazyDevTools />}
    </QueryClientProvider>
  );
}
