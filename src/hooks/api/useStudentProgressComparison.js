/**
 * Student Progress Comparison API Hook
 * 
 * React Query hook for fetching student progress comparison data
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

/**
 * Fetch student progress comparison for a course
 * 
 * @param {string} courseId - Course UUID
 * @param {string|null} cohortId - Optional cohort ID to filter by
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useStudentProgressComparison(courseId, cohortId = null, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole) && courseId;

  return useQuery({
    queryKey: ['studentProgressComparison', courseId, cohortId],
    queryFn: async () => {
      const params = new URLSearchParams({
        courseId: courseId,
      });

      if (cohortId) {
        params.append('cohortId', cohortId);
      }

      const response = await apiClient.get(`/students/roadmap/compare?${params.toString()}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student progress comparison');
      }

      return response;
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 60000, // 1 minute (longer than roadmap data since it's read-only)
    refetchOnWindowFocus: false, // Don't refetch on focus for comparison data
    retry: 1,
    ...options,
  });
}

/**
 * Fetch cohorts available for filtering in a course
 * 
 * @param {string} courseId - Course UUID
 * @returns {Object} React Query result
 */
export function useCohortsForCourse(courseId) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole) && courseId;

  return useQuery({
    queryKey: ['courseCohorts', courseId],
    queryFn: async () => {
      const response = await apiClient.get(`/students/roadmap/compare/cohorts?courseId=${courseId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch cohorts');
      }

      return response;
    },
    enabled: shouldFetch,
    staleTime: 300000, // 5 minutes (cohorts don't change often)
    retry: 1,
  });
}
