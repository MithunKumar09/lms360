/**
 * useCourses API Hooks
 * 
 * React Query hooks for course operations.
 * Provides queries and mutations for course data management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildUrl, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import { buildRoleBasedQueryParams, transformCourseResponse } from '@/lib/course/queryBuilders.js';

/**
 * useCourseManagement Query Hook
 * 
 * Fetches courses for course management page based on user role.
 * Implements role-based query parameter building and response transformation.
 * 
 * @param {Object} filters - Filter parameters
 * @param {string} filters.role - User role ('superadmin' | 'admin' | 'instructor')
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 10)
 * @param {string} filters.search - Search query
 * @param {string} filters.instructorId - Instructor ID filter
 * @param {string} filters.level - Course level filter
 * @param {string} filters.organizationId - Organization ID filter
 * @param {string} filters.classId - Class ID filter
 * @param {string} filters.subjectId - Subject ID filter
 * @param {string} filters.status - Status filter ('active' | 'inactive')
 * @param {string} filters.sortBy - Sort option ('newest' | 'oldest' | 'title_asc' | 'title_desc')
 * @param {string} filters.dateFrom - Start date filter (ISO date)
 * @param {string} filters.dateTo - End date filter (ISO date)
 * @param {string[]} filters.classIds - Class IDs (for instructor)
 * @param {string[]} filters.subjectIds - Subject IDs (for instructor)
 * @param {Object} options - Query options
 * @returns {Object} Course management query
 */
export const useCourseManagement = (filters = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Build role-based query parameters
  const buildQueryParams = () => {
    try {
      return buildRoleBasedQueryParams(filters, user);
    } catch (error) {
      console.error('Error building query params:', error);
      // Fallback to basic params
      return {
        role: filters.role,
        page: filters.page || 1,
        limit: filters.limit || 10,
        ...(filters.search && { search: filters.search }),
        ...(filters.instructorId && { instructorId: filters.instructorId }),
        ...(filters.level && { level: filters.level }),
        ...(filters.organizationId && { organizationId: filters.organizationId }),
        ...(filters.classId && { classId: filters.classId }),
        ...(filters.subjectId && { subjectId: filters.subjectId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.classIds && filters.classIds.length > 0 && { classIds: filters.classIds.join(',') }),
        ...(filters.subjectIds && filters.subjectIds.length > 0 && { subjectIds: filters.subjectIds.join(',') }),
      };
    }
  };

  const queryParams = buildQueryParams();

  // Create stable query key for caching
  // Sort keys to ensure consistent cache keys
  const sortedParams = Object.keys(queryParams)
    .sort()
    .reduce((acc, key) => {
      acc[key] = queryParams[key];
      return acc;
    }, {});

  const queryKey = ['courses', 'management', filters.role || user?.role, sortedParams];

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🔵 [CLIENT] [useCourseManagement] ===== FETCH STARTED =====');
      console.log('🔵 [CLIENT] [useCourseManagement] Query params:', queryParams);
      console.log('🔵 [CLIENT] [useCourseManagement] User:', { id: user?.id, role: user?.role });
      
      const url = buildUrl(getEndpoint('courses.management'), {}, queryParams);
      console.log('🔵 [CLIENT] [useCourseManagement] Request URL:', url);
      
      const response = await apiClient.get(url);

      console.log('🔵 [CLIENT] [useCourseManagement] Raw response:', {
        success: response.success,
        error: response.error,
        coursesCount: response.courses?.length || 0,
        pagination: response.pagination,
      });

      if (!response.success) {
        console.error('🔵 [CLIENT] [useCourseManagement] API returned error:', response.error);
        throw new Error(response.error || 'Failed to fetch courses');
      }

      // Transform response to include permission flags
      try {
        const transformed = transformCourseResponse(response, user);
        console.log('🔵 [CLIENT] [useCourseManagement] Transformed response:', {
          coursesCount: transformed.courses?.length || 0,
          pagination: transformed.pagination,
        });
        console.log('🔵 [CLIENT] [useCourseManagement] ===== FETCH SUCCESSFUL =====');
        return transformed;
      } catch (error) {
        console.error('🔵 [CLIENT] [useCourseManagement] Error transforming response:', error);
        // Return original response if transformation fails
        return response;
      }
    },
    enabled: isAuthenticated && !!user && (options.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes - cache kept for 5 minutes after unused
    refetchOnWindowFocus: false, // Prevent infinite refetching on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: false, // No automatic polling
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (except 401)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // Mark as critical query for preloader tracking
    meta: { isCritical: true },
    ...options,
  });
};

/**
 * useDeleteCourse Mutation Hook
 * 
 * Deletes a course with all its activities and connections.
 * 
 * @returns {Object} Delete course mutation
 */
export const useDeleteCourse = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (courseId) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('courses.delete'), { id: courseId })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete course');
      }

      return response;
    },
    onSuccess: (data, courseId) => {
      // Invalidate all course queries
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      createAlert('success', 'Course deleted successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete course');
    },
  });
};

/**
 * useUpdateCourseStatus Mutation Hook
 * 
 * Updates course status (active/inactive).
 * 
 * @returns {Object} Update course status mutation
 */
export const useUpdateCourseStatus = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ courseId, status }) => {
      const response = await apiClient.patch(
        buildEndpoint(getEndpoint('courses.updateStatus'), { id: courseId }),
        { status }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update course status');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate course management queries
      queryClient.invalidateQueries({ queryKey: ['courses', 'management'] });
      createAlert('success', 'Course status updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update course status');
    },
  });
};

/**
 * usePinCourse Mutation Hook
 * 
 * Pins or unpins a course for prioritization.
 * 
 * @returns {Object} Pin course mutation
 */
export const usePinCourse = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ courseId, isPinned }) => {
      const response = await apiClient.patch(
        buildEndpoint(getEndpoint('courses.pin'), { id: courseId }),
        { isPinned }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update course pin status');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate course management queries
      queryClient.invalidateQueries({ queryKey: ['courses', 'management'] });
      createAlert('success', 'Course pin status updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update course pin status');
    },
  });
};

/**
 * useBulkDeleteCourses Mutation Hook
 * 
 * Deletes multiple courses at once.
 * 
 * @returns {Object} Bulk delete courses mutation
 */
export const useBulkDeleteCourses = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (courseIds) => {
      // Delete courses sequentially to handle errors properly
      const results = await Promise.allSettled(
        courseIds.map((courseId) =>
          apiClient.delete(buildEndpoint(getEndpoint('courses.delete'), { id: courseId }))
        )
      );

      const failed = results.filter((r) => r.status === 'rejected' || !r.value?.success);
      
      if (failed.length > 0) {
        throw new Error(`${failed.length} course(s) failed to delete`);
      }

      return { success: true, deleted: courseIds.length };
    },
    onSuccess: (data) => {
      // Invalidate all course queries
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      createAlert('success', `${data.deleted} course(s) deleted successfully`);
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete courses');
    },
  });
};

/**
 * useBulkUpdateCourseStatus Mutation Hook
 * 
 * Updates status for multiple courses at once.
 * 
 * @returns {Object} Bulk update course status mutation
 */
export const useBulkUpdateCourseStatus = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ courseIds, status }) => {
      // Update courses sequentially
      const results = await Promise.allSettled(
        courseIds.map((courseId) =>
          apiClient.patch(
            buildEndpoint(getEndpoint('courses.updateStatus'), { id: courseId }),
            { status }
          )
        )
      );

      const failed = results.filter((r) => r.status === 'rejected' || !r.value?.success);
      
      if (failed.length > 0) {
        throw new Error(`${failed.length} course(s) failed to update`);
      }

      return { success: true, updated: courseIds.length };
    },
    onSuccess: (data) => {
      // Invalidate course management queries
      queryClient.invalidateQueries({ queryKey: ['courses', 'management'] });
      createAlert('success', `${data.updated} course(s) status updated successfully`);
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update course status');
    },
  });
};

