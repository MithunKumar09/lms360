/**
 * useRecommendedMiniCourses API Hook
 * 
 * React Query hook for fetching recommended mini courses.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useRecommendedMiniCourses Query Hook
 * 
 * Fetches published mini courses (recommended for students).
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {boolean} options.recommended - Filter recommended mini courses (default: true)
 * @param {string} options.search - Search term
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Object} Recommended mini courses query
 */
export const useRecommendedMiniCourses = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useQuery({
    queryKey: ['recommended-mini-courses', options.recommended, options.search, options.page, options.limit],
    queryFn: async () => {
      const params = {
        status: 'published',
      };
      if (options.recommended !== false) params.recommended = 'true';
      if (options.search) params.search = options.search;
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const response = await apiClient.get('/mini-courses', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch recommended mini courses');
      }

      return response;
    },
    enabled: isAuthenticated && (userRole === 'student' || userRole === 'alumni' || userRole === 'admin' || userRole === 'superadmin') && (options.enabled !== false),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export default useRecommendedMiniCourses;

