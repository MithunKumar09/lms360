/**
 * useAssignmentReport API Hook
 * 
 * React Query hook for fetching assignment report data.
 * Uses caching strategy to avoid unnecessary API calls.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';

/**
 * useAssignmentReport Query Hook
 * 
 * Fetches assignment report data.
 * 
 * @param {Object} filters - Report filters
 * @param {string} filters.courseId - Course ID filter
 * @param {string} filters.cohortId - Cohort ID filter
 * @param {string} filters.classId - Class ID filter
 * @param {string} filters.subjectId - Subject ID filter
 * @param {string} filters.dateFrom - Start date filter
 * @param {string} filters.dateTo - End date filter
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Assignment report query
 */
export const useAssignmentReport = (filters = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const getCachedReport = useAssignCourseStore((state) => state.getCachedReport);
  const setReportCache = useAssignCourseStore((state) => state.setReportCache);

  return useQuery({
    queryKey: [
      'assignmentReport',
      user?.role,
      user?.orgId,
      filters.courseId,
      filters.cohortId,
      filters.classId,
      filters.subjectId,
      filters.dateFrom,
      filters.dateTo,
    ],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedReport();
      if (cached) {
        return cached;
      }

      // Build query parameters
      const params = new URLSearchParams({
        role: user?.role,
        format: 'json',
      });

      // Add filters
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.cohortId) params.append('cohortId', filters.cohortId);
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      // Fetch from API
      const response = await apiClient.get(
        `/courses/assignments/report?${params.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assignment report');
      }

      // Extract data (apiClient spreads response, so data is directly accessible)
      const result = {
        success: response.success,
        data: response.data || response,
        assignments: response.data?.assignments || response.assignments || [],
        summary: response.data?.summary || response.summary || {},
      };

      // Cache the result
      setReportCache(result);

      return result;
    },
    enabled:
      isAuthenticated &&
      (user?.role === 'admin' || user?.role === 'instructor') &&
      (options.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useAssignmentReport;

