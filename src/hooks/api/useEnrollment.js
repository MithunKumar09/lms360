/**
 * Enrollment Hooks
 * 
 * React Query hooks for course enrollment operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';

/**
 * Enroll in a course
 */
export function useEnrollCourse() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async ({ courseId }) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to enroll in a course');
      }

      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll in course');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all enrollment and course-related queries using predicate-based invalidation
      // This ensures all queries are invalidated regardless of filters, pagination, or course IDs
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'courses' || 
                 key === 'enrollment' || 
                 key === 'enrollment-status' ||
                 key === 'courseDetails';
        },
      });
    },
  });
}

/**
 * Check enrollment status for a course
 */
export function useCheckEnrollment(courseId, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole) && !!courseId;

  return useQuery({
    queryKey: ['enrollment', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check enrollment status');
      }

      return response.json();
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * Get enrollment status for multiple courses
 */
export function useBulkEnrollmentStatus(courseIds, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && 
                      allowedRoles.includes(userRole) && 
                      courseIds && 
                      courseIds.length > 0;

  return useQuery({
    queryKey: ['enrollment-status', courseIds.sort().join(',')],
    queryFn: async () => {
      const response = await fetch('/api/courses/enrollment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get enrollment status');
      }

      return response.json();
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

