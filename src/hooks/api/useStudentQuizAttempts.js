/**
 * useStudentQuizAttempts API Hook
 * 
 * React Query hook for fetching student's quiz attempts.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useStudentQuizAttempts Query Hook
 * 
 * Fetches quiz attempts for the current student user.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {string} options.quizId - Filter by quiz ID
 * @param {string} options.status - Filter by status (in_progress, submitted, timeout, abandoned)
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Object} Student quiz attempts query
 */
export const useStudentQuizAttempts = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useQuery({
    queryKey: ['student-quiz-attempts', options.quizId, options.status, options.page, options.limit],
    queryFn: async () => {
      const params = {};
      if (options.quizId) params.quizId = options.quizId;
      if (options.status) params.status = options.status;
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const response = await apiClient.get('/quiz-attempts', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student quiz attempts');
      }

      return response;
    },
    enabled: isAuthenticated && (userRole === 'student' || userRole === 'alumni') && (options.enabled !== false),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export default useStudentQuizAttempts;

