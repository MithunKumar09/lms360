/**
 * useQuizAttempts API Hook
 * 
 * React Query hook for fetching quiz attempts.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useQuizAttempts Query Hook
 * 
 * Fetches quiz attempts for the current user's role.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {string} options.quizId - Filter by quiz ID
 * @param {string} options.status - Filter by status
 * @param {string} options.orgId - Filter by organization ID (superadmin only)
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Object} Quiz attempts query
 */
export const useQuizAttempts = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['quiz-attempts', options.quizId, options.status, options.orgId, options.page, options.limit],
    queryFn: async () => {
      const params = {};
      if (options.quizId) params.quizId = options.quizId;
      if (options.status) params.status = options.status;
      if (options.orgId) params.orgId = options.orgId;
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const response = await apiClient.get('/quiz-attempts', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quiz attempts');
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

