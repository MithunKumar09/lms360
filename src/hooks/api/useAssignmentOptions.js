/**
 * useAssignmentOptions API Hook
 * 
 * React Query hook for fetching assignment options for a course.
 * Uses caching strategy to avoid unnecessary API calls.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';

/**
 * useAssignmentOptions Query Hook
 * 
 * Fetches available assignment options for a course.
 * 
 * @param {string} courseId - Course ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Assignment options query
 */
export const useAssignmentOptions = (courseId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const getCachedOptions = useAssignCourseStore((state) => state.getCachedOptions);
  const setOptionsCache = useAssignCourseStore((state) => state.setOptionsCache);

  return useQuery({
    queryKey: ['assignmentOptions', courseId, user?.role],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedOptions(courseId);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const params = new URLSearchParams({
        role: user?.role,
      });

      try {
        const response = await apiClient.get(
          `/courses/${courseId}/assignment-options?${params.toString()}`
        );

        if (!response.success) {
          throw new Error(
            response.error ||
              response.message ||
              'Failed to fetch assignment options. Please try again.'
          );
        }

        // Extract data (apiClient spreads response, so data is directly accessible)
        const result = {
          success: response.success,
          data: response.data || response,
          options: response.data?.options || response.options || {},
          mainAssignments: response.data?.mainAssignments || response.mainAssignments || {},
        };

        // Cache the result
        setOptionsCache(courseId, result);

        return result;
      } catch (error) {
        // Enhance error message for better UX
        if (error.message) {
          throw error;
        }
        throw new Error(
          error.response?.data?.error ||
            error.response?.data?.message ||
            'Network error. Please check your connection and try again.'
        );
      }

    },
    enabled:
      !!courseId &&
      isAuthenticated &&
      (user?.role === 'admin' || user?.role === 'instructor') &&
      (options.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useAssignmentOptions;

