/**
 * useActivityFeed API Hooks
 * 
 * React Query hooks for activity feed operations.
 * Provides queries for activity feed data with polling support.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useActivityFeed Query Hook
 * 
 * Fetches activity feed for mentor or student with filters and polling support.
 * 
 * @param {Object} options - Query options
 * @param {string} options.userRole - User role ('mentor' | 'student')
 * @param {Object} options.filters - Filter parameters (cohort_id, student_id, mentor_id, activity_type, since, page, limit)
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {number} options.pollInterval - Polling interval in milliseconds (0 to disable polling)
 * @returns {Object} Activity feed query
 */
export const useActivityFeed = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = options.userRole || user?.role;
  const { filters = {}, enabled = true, pollInterval = 30000 } = options; // Default 30 seconds polling

  const endpoint = userRole === 'mentor' 
    ? getEndpoint('mentor.activityFeed')
    : getEndpoint('student.activityFeed');

  return useQuery({
    queryKey: ['activity-feed', userRole, filters],
    queryFn: async () => {
      const response = await apiClient.get(endpoint, filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch activity feed');
      }

      return response.data;
    },
    enabled: isAuthenticated && enabled && !!userRole,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: pollInterval > 0 ? pollInterval : false, // Polling support
    retry: 1,
  });
};
