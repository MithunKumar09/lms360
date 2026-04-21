/**
 * useAssignableCourses API Hook
 * 
 * React Query hook for fetching assignable courses for admin/instructor.
 * Uses caching strategy to avoid unnecessary API calls.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';

/**
 * useAssignableCourses Query Hook
 * 
 * Fetches assignable courses based on role and filters.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Assignable courses query
 */
export const useAssignableCourses = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const filters = useAssignCourseStore((state) => state.filters);
  const getCachedCourses = useAssignCourseStore((state) => state.getCachedCourses);
  const setCoursesCache = useAssignCourseStore((state) => state.setCoursesCache);

  return useQuery({
    queryKey: [
      'assignableCourses',
      user?.role,
      user?.orgId,
      filters.cohortId,
      filters.classId,
      filters.subjectId,
      filters.instructorId,
      filters.createdFrom,
      filters.createdTo,
    ],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedCourses();
      if (cached) {
        return cached;
      }

      // Build query parameters
      const params = new URLSearchParams({
        role: user?.role,
      });

      // Add filters
      if (filters.cohortId) params.append('cohortId', filters.cohortId);
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.instructorId) params.append('instructorId', filters.instructorId);
      if (filters.createdFrom) params.append('createdFrom', filters.createdFrom);
      if (filters.createdTo) params.append('createdTo', filters.createdTo);

      // Fetch from API
      try {
        const response = await apiClient.get(`/courses/assignable?${params.toString()}`);

        if (!response.success) {
          throw new Error(
            response.error ||
              response.message ||
              'Failed to fetch assignable courses. Please try again.'
          );
        }

        // Extract data (apiClient spreads response, so data is directly accessible)
        const result = {
          success: response.success,
          data: response.data || response,
          courses: response.data?.courses || response.courses || [],
          pagination: response.data?.pagination || response.pagination || {},
        };

        // Cache the result
        setCoursesCache(result);

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
      isAuthenticated &&
      (user?.role === 'admin' || user?.role === 'instructor') &&
      (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    // Keep previous data while fetching new data (better UX)
    placeholderData: (previousData) => previousData,
    // Optimize for performance
    structuralSharing: true,
    ...options,
  });
};

export default useAssignableCourses;

