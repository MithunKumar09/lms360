/**
 * useQuizzesForDropdown API Hook
 * 
 * React Query hook for fetching quizzes for dropdown selection.
 * Supports instructor, admin, and superadmin roles.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useQuizzesForDropdown Query Hook
 * 
 * Fetches quizzes for dropdown selection based on user role:
 * - Instructor: Only their quizzes
 * - Admin: Quizzes from their organization
 * - Superadmin: All quizzes (or filtered by org if orgId provided)
 * 
 * @param {Object} options - Query options
 * @param {string} options.orgId - Filter by organization ID (superadmin only)
 * @returns {Object} Quizzes query
 */
const useQuizzesForDropdown = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useQuery({
    queryKey: ['quizzes', 'dropdown', userRole, options.orgId],
    queryFn: async () => {
      const params = {
        page: 1,
        limit: 1000, // Get all quizzes for dropdown
      };

      // Add orgId filter for superadmin if provided
      if (userRole === 'superadmin' && options.orgId) {
        params.orgId = options.orgId;
      }

      const response = await apiClient.get('/quizzes', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quizzes');
      }

      return response;
    },
    enabled: isAuthenticated && ['instructor', 'admin', 'superadmin'].includes(userRole),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export default useQuizzesForDropdown;

