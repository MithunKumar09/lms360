//src/hooks/api/useStudentCourses.js
/**
 * Student Courses Hooks
 * 
 * React Query hooks for fetching student courses (enrolled, active, completed)
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

/**
 * Fetch enrolled courses for authenticated student
 * @param {Object} filters - Filter parameters (page, limit, status)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useEnrolledCourses(filters = {}, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole);

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const status = filters.status; // 'active' or 'completed'

  return useQuery({
    queryKey: ['enrolledCourses', page, limit, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) {
        params.append('status', status);
      }

      const response = await apiClient.get(`/students/enrolled-courses?${params.toString()}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch enrolled courses');
      }

      return response;
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
    ...options,
  });
}

/**
 * Fetch active courses (available to student via class/subject assignments)
 * @param {Object} filters - Filter parameters (page, limit)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useActiveCourses(filters = {}, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole);

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const programTypeId = filters.programTypeId; // Optional program type filter

  return useQuery({
    queryKey: ['activeCourses', page, limit, programTypeId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (programTypeId) {
        params.append('program_type_id', programTypeId);
      }

      const response = await apiClient.get(`/students/active-courses?${params.toString()}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active courses');
      }

      return response;
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
    ...options,
  });
}

/**
 * Fetch completed courses (enrolled courses with 100% progress)
 * @param {Object} filters - Filter parameters (page, limit)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useCompletedCourses(filters = {}, options = {}) {
  // Completed courses are just enrolled courses with status='completed'
  return useEnrolledCourses(
    { ...filters, status: 'completed' },
    options
  );
}

