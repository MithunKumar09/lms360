/**
 * useStudentAssignmentDetails API Hook
 * 
 * React Query hook for fetching student assignment details.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useStudentAssignmentDetails Query Hook
 * 
 * Fetches detailed assignment information for a student.
 * 
 * @param {string} assignmentId - Assignment ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Assignment details query
 */
export const useStudentAssignmentDetails = (assignmentId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['assignment', 'student', assignmentId],
    queryFn: async () => {
      const response = await apiClient.get(`/assignments/student/${assignmentId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assignment');
      }

      return response;
    },
    enabled: isAuthenticated && !!assignmentId && (options.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes - prevent excessive refetching
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on focus
    refetchOnReconnect: true,
    refetchOnMount: true, // Only refetch if stale
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
  });
};

export default useStudentAssignmentDetails;

