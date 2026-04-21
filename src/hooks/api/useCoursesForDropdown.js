/**
 * useCoursesForDropdown API Hook
 * 
 * React Query hook for fetching courses for dropdowns in quiz/assignment forms.
 * Uses the same filtering logic as course management page for each role.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useCoursesForDropdown Query Hook
 * 
 * Fetches courses for dropdown based on user role:
 * - Instructor: Courses matching org, classes, and subjects
 * - Admin: All courses of their organization
 * - Superadmin: All courses (or filtered by org if needed)
 * 
 * @param {Object} options - Query options
 * @returns {Object} Courses query
 */
export const useCoursesForDropdown = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['courses-dropdown', user?.id, user?.role],
    queryFn: async () => {
      // Fetch courses using same logic as course management page
      // The API automatically applies role-based filtering
      const params = new URLSearchParams({
        limit: '1000', // Get all courses (for dropdown)
        page: '1',
      });
      
      const response = await apiClient.get(`/courses/management?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch courses');
      }

      return {
        courses: response.courses || [],
        total: response.pagination?.total || 0,
      };
    },
    enabled: isAuthenticated && ['instructor', 'admin', 'superadmin'].includes(user?.role) && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useCoursesForDropdown;

