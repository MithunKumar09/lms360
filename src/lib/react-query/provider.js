/**
 * React Query Provider
 * 
 * React Query client configuration and provider component.
 * Provides global query configuration and error handling.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * Create React Query client with default options
 * @returns {QueryClient} React Query client
 */
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Time before data is considered stale (5 minutes)
        staleTime: 5 * 60 * 1000,
        // Time before unused data is removed from cache (10 minutes)
        gcTime: 10 * 60 * 1000,
        // Retry failed requests
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (except 401)
          if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        // Retry delay (exponential backoff)
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus - optimized to prevent excessive refetches
        refetchOnWindowFocus: false, // Set to false by default, enable per-query if needed
        // Refetch on reconnect
        refetchOnReconnect: true,
        // Refetch on mount - only if data is stale (prevents infinite loops)
        refetchOnMount: true, // Only refetch if data is stale
        // Network mode for better offline support
        networkMode: 'online',
        // Keep previous data while fetching new data
        keepPreviousData: false,
        // Don't use placeholderData to avoid stale data issues
      },
      mutations: {
        // Retry failed mutations
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
        // Retry delay
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
};

/**
 * React Query Provider Component
 * 
 * Wraps the app with React Query provider and devtools.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} React Query provider
 */
export const ReactQueryProvider = ({ children }) => {
  // Create query client (singleton)
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default ReactQueryProvider;


