/**
 * Vendor Enrollments API Hooks
 * 
 * React Query hooks for vendor enrollment operations.
 * Provides queries for vendor's course enrollments and enrolled students.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useVendorCourseEnrollments Query Hook
 * 
 * Fetches vendor's courses with enrollment statistics
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 12)
 * @param {string} options.status - Filter by course status
 * @param {string} options.search - Search in course title
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Courses query
 */
export const useVendorCourseEnrollments = (options = {}) => {
  const { page = 1, limit = 12, status = null, search = null, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorCourseEnrollments', user?.id, page, limit, status, search],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get(`/vendor/courses/enrollments?${queryParams.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch course enrollments');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 403 (permission denied) or 404
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * useVendorEnrolledStudents Query Hook
 * 
 * Fetches all enrolled students across vendor's courses
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.courseId - Filter by specific course
 * @param {string} options.status - Filter by enrollment status
 * @param {string} options.search - Search in student name/email
 * @param {number} options.minProgress - Minimum progress percentage
 * @param {number} options.maxProgress - Maximum progress percentage
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Students query
 */
export const useVendorEnrolledStudents = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    courseId = null,
    status = null,
    search = null,
    minProgress = null,
    maxProgress = null,
    enabled = true,
  } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: [
      'vendorEnrolledStudents',
      user?.id,
      page,
      limit,
      courseId,
      status,
      search,
      minProgress,
      maxProgress,
    ],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (courseId) queryParams.append('courseId', courseId);
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);
      if (minProgress !== null) queryParams.append('minProgress', minProgress.toString());
      if (maxProgress !== null) queryParams.append('maxProgress', maxProgress.toString());

      const response = await apiClient.get(`/vendor/enrollments/students?${queryParams.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch enrolled students');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * useCourseEnrolledStudents Query Hook
 * 
 * Fetches enrolled students for a specific course
 * 
 * @param {string} courseId - Course ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.status - Filter by enrollment status
 * @param {string} options.search - Search in student name/email
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Students query
 */
export const useCourseEnrolledStudents = (courseId, options = {}) => {
  const { page = 1, limit = 20, status = null, search = null, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['courseEnrolledStudents', courseId, user?.id, page, limit, status, search],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!courseId) {
        throw new Error('Course ID is required');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get(
        `/vendor/courses/${courseId}/enrollments?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch enrolled students');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!courseId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export default {
  useVendorCourseEnrollments,
  useVendorEnrolledStudents,
  useCourseEnrolledStudents,
};
