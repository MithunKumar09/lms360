/**
 * useStudentQuizStatistics API Hook
 * 
 * React Query hook for fetching student quiz statistics.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useStudentQuizStatistics Query Hook
 * 
 * Fetches quiz statistics for the current student user.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {string} options.studentId - Student ID (optional, defaults to current user)
 * @returns {Object} Student quiz statistics query
 */
export const useStudentQuizStatistics = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useQuery({
    queryKey: ['student-quiz-statistics', options.studentId || user?.id],
    queryFn: async () => {
      const params = {};
      if (options.studentId) params.studentId = options.studentId;

      const response = await apiClient.get('/quiz-attempts/statistics', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student quiz statistics');
      }

      return response;
    },
    enabled: isAuthenticated && (userRole === 'student' || userRole === 'alumni' || userRole === 'admin' || userRole === 'superadmin' || userRole === 'instructor') && (options.enabled !== false),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export default useStudentQuizStatistics;

