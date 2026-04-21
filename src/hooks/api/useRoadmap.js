//src/hooks/api/useRoadmap.js
/**
 * Roadmap API Hooks
 * 
 * React Query hooks for fetching student roadmap data
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

/**
 * Fetch roadmap data for authenticated student
 * 
 * @param {Object} options - React Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {number} options.refetchInterval - Auto-refetch interval in ms
 * @param {number} options.staleTime - Time before data is considered stale
 * @returns {Object} React Query result with roadmap data
 */
export function useRoadmap(options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole);

  return useQuery({
    queryKey: ['roadmap', user?.id],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/students/roadmap');
        
        if (!response.success) {
          // Classify error for better user experience
          if (response.status === 401) {
            throw new Error('Please log in to view your roadmap');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view roadmaps');
          } else if (response.status === 404) {
            throw new Error('Roadmap data not found');
          } else if (response.status >= 500) {
            throw new Error('Server error. Please try again later');
          } else {
            throw new Error(response.error || 'Failed to fetch roadmap data');
          }
        }

        return response;
      } catch (error) {
        // Log error for debugging
        console.error('[useRoadmap] Error:', error);
        throw error;
      }
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: options.staleTime || 30000, // 30 seconds default
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchInterval: options.refetchInterval || false, // No auto-refetch by default (set in component)
    refetchOnWindowFocus: false, // Prevent excessive refetches
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: 1000,
    // Use placeholder data for smoother transitions
    placeholderData: (previousData) => previousData,
    ...options,
  });
}
