/**
 * useCourseDetails API Hook
 * 
 * React Query hook for fetching a single course by ID with all details.
 * Used for course details pages.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { buildEndpoint, getEndpoint } from '@/lib/api/endpoints.js';

/**
 * useCourseDetails Query Hook
 * 
 * Fetches course details by ID including all related data.
 * 
 * @param {string} courseId - Course UUID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Course details query
 */
export const useCourseDetails = (courseId, options = {}) => {
  return useQuery({
    queryKey: ['course', 'details', courseId],
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      const endpoint = buildEndpoint(getEndpoint('courses.get'), { id: courseId });
      const response = await apiClient.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch course details');
      }

      return response.course;
    },
    enabled: !!courseId && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 404 (course not found) or 403 (permission denied)
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export default useCourseDetails;

