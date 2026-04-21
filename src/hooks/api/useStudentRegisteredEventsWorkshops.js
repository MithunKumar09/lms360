/**
 * Student Registered Events & Workshops Hook
 * 
 * React Query hook for fetching student's registered events and workshops
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

/**
 * Fetch registered events and workshops for authenticated student
 * @param {Object} options - Filter options and React Query options
 * @param {string} options.type - Filter by type: 'events', 'workshops', or 'all' (default: 'all')
 * @param {number} options.limit - Limit number of results (default: 10)
 * @param {Object} options.queryOptions - React Query options
 * @returns {Object} React Query result
 */
export function useStudentRegisteredEventsWorkshops(options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole);

  const { type = 'all', limit = 10, ...queryOptions } = options;

  return useQuery({
    queryKey: ['studentRegisteredEventsWorkshops', type, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
      });

      const response = await apiClient.get(`/students/registered-events-workshops?${params.toString()}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch registered events and workshops');
      }

      return response.data;
    },
    enabled: shouldFetch && (queryOptions.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
    ...queryOptions,
  });
}
