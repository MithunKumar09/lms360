/**
 * useStudentAssignments API Hook
 * 
 * React Query hook for fetching student assignments.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useStudentAssignments Query Hook
 * 
 * Fetches assignments available to the current student.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {string} options.courseId - Filter by course ID
 * @param {string} options.status - Filter by status ('all' | 'not_submitted' | 'submitted' | 'graded')
 * @param {string} options.sortBy - Sort by field ('deadline' | 'submitted_at' | 'title')
 * @param {string} options.sortOrder - Sort order ('asc' | 'desc')
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Object} Student assignments query
 */
export const useStudentAssignments = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['assignments', 'student', options.courseId, options.status, options.sortBy, options.sortOrder, options.page, options.limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.courseId) params.append('courseId', options.courseId);
      if (options.status) params.append('status', options.status);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await apiClient.get(`/assignments/student?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assignments');
      }

      return response;
    },
    enabled: isAuthenticated && (options.enabled !== false),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export default useStudentAssignments;

