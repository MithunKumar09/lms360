/**
 * useCoursesForDropdownWithPagination API Hook
 * 
 * React Query hook for fetching courses for dropdowns with pagination support.
 * Supports filtering by instructor ID to get courses matching instructor's classes/subjects/cohorts.
 * 
 * - If instructorId is provided: Fetches courses matching that instructor's classes/subjects/cohorts
 * - If instructorId is not provided: Fetches all available courses in the organization
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useCoursesForDropdownWithPagination Query Hook
 * 
 * Fetches courses for dropdown with pagination based on user role:
 * - Instructor: Courses matching org, classes, and subjects
 * - Admin: All courses of their organization (or filtered by instructor if provided)
 * - Superadmin: All courses (or filtered by org/instructor if provided)
 * 
 * @param {Object} options - Query options
 * @param {string|null} options.instructorId - Instructor ID to filter courses by
 * @param {string|null} options.organizationId - Organization ID (for superadmin)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.search - Search query
 * @returns {Object} Courses query with pagination
 */
export const useCoursesForDropdownWithPagination = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  const {
    instructorId = null,
    organizationId = null,
    page = 1,
    limit = 20,
    search = '',
    enabled = true,
  } = options;

  return useQuery({
    queryKey: [
      'courses-dropdown-paginated',
      user?.id,
      user?.role,
      instructorId,
      organizationId,
      page,
      limit,
      search,
    ],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Add search if provided
      if (search) {
        params.append('search', search);
      }
      
      // Add instructor ID filter if provided (for admin/superadmin)
      if (instructorId) {
        params.append('instructorId', instructorId);
      }
      
      // Add organization ID filter if provided (for superadmin)
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      
      const response = await apiClient.get(`/courses/management?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch courses');
      }

      return {
        courses: response.courses || [],
        pagination: response.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
    },
    enabled: isAuthenticated && 
             ['instructor', 'admin', 'superadmin'].includes(user?.role) && 
             enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export default useCoursesForDropdownWithPagination;

