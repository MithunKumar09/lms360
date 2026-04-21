/**
 * useStudentQuizzes API Hook
 * 
 * React Query hook for fetching quizzes visible to students.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useStudentQuizzes Query Hook
 * 
 * Fetches quizzes visible to the current student user.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {string} options.courseId - Filter by course ID
 * @param {string} options.quizType - Filter by quiz type (main_course, mini_course, global)
 * @param {string} options.status - Filter by status (published, closed)
 * @param {string} options.search - Search term
 * @param {string} options.sort - Sort order (newest, oldest, title-asc, title-desc)
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Object} Student quizzes query
 */
export const useStudentQuizzes = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useQuery({
    queryKey: ['student-quizzes', options.courseId, options.quizType, options.status, options.search, options.sort, options.page, options.limit],
    queryFn: async () => {
      const params = {
        studentView: 'true',
      };
      if (options.courseId) params.courseId = options.courseId;
      if (options.quizType) params.quizType = options.quizType;
      if (options.status) params.status = options.status;
      if (options.search) params.search = options.search;
      if (options.sort) params.sort = options.sort;
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const response = await apiClient.get('/quizzes', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student quizzes');
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

export default useStudentQuizzes;

