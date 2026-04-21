/**
 * useInstructorCourses API Hook
 * 
 * React Query hook for fetching courses for instructor.
 * Uses the same filtering logic as course management page:
 * - Filters by organization
 * - Filters by instructor's classes and subjects
 * Used for assignment and quiz creation forms.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useInstructorCourses Query Hook
 * 
 * Fetches courses matching instructor's organization, classes, and subjects.
 * Same logic as course management page.
 * 
 * @param {Object} options - Query options
 * @returns {Object} Courses query
 */
export const useInstructorCourses = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['instructor-courses', user?.id],
    queryFn: async () => {
      // Fetch courses using same logic as course management page
      // Do NOT use createdBy filter - use org/class/subject filtering instead
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
    enabled: isAuthenticated && user?.role === 'instructor' && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useInstructorCourses;

