/**
 * Course Progress Hook
 * 
 * React Query hook for fetching course progress
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';

/**
 * Fetch course progress for authenticated student
 * @param {string} courseId - Course ID
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useCourseProgress(courseId, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole) && !!courseId;

  return useQuery({
    queryKey: ['courseProgress', courseId],
    queryFn: async () => {
      const endpoint = buildEndpoint(getEndpoint('courses.progress'), { id: courseId });
      const response = await apiClient.get(endpoint);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch course progress');
      }

      return response.progress;
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
    ...options,
  });
}

