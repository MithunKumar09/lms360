/**
 * Vendor Assignments API Hooks
 * 
 * React Query hooks for vendor assignment operations.
 * Provides queries and mutations for vendor's assignments.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useVendorAssignments Query Hook
 * 
 * Fetches vendor's assignments
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.courseId - Filter by course ID
 * @param {string} options.status - Filter by status
 * @param {string} options.search - Search in title
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Assignments query
 */
export const useVendorAssignments = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    courseId = null,
    status = null,
    search = null,
    enabled = true,
  } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorAssignments', user?.id, page, limit, courseId, status, search],
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

      const response = await apiClient.get(`/vendor/assignments?${queryParams.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assignments');
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
 * useVendorAssignment Query Hook
 * 
 * Fetches a single vendor assignment
 * 
 * @param {string} assignmentId - Assignment ID
 * @param {Object} options - Query options
 * @returns {Object} Assignment query
 */
export const useVendorAssignment = (assignmentId, options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorAssignment', assignmentId, user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!assignmentId) {
        throw new Error('Assignment ID is required');
      }

      const response = await apiClient.get(`/vendor/assignments/${assignmentId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch assignment');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!assignmentId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * useVendorCourses Hook
 * 
 * Fetches vendor's published courses for assignment/quiz creation
 * 
 * @param {Object} options - Query options
 * @returns {Object} Courses query
 */
export const useVendorCourses = (options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorCourses', user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/vendor/assignments/courses');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch courses');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * useCreateVendorAssignment Mutation Hook
 * 
 * Creates a new assignment for vendor's course
 * 
 * @returns {Object} Create mutation
 */
export const useCreateVendorAssignment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/vendor/assignments', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create assignment');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate assignments list
      queryClient.invalidateQueries({ queryKey: ['vendorAssignments'] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Assignment created successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to create assignment',
      });
    },
  });
};

/**
 * useUpdateVendorAssignment Mutation Hook
 * 
 * Updates an existing vendor assignment
 * 
 * @returns {Object} Update mutation
 */
export const useUpdateVendorAssignment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ assignmentId, data }) => {
      const response = await apiClient.put(`/vendor/assignments/${assignmentId}`, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update assignment');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate assignments list and specific assignment
      queryClient.invalidateQueries({ queryKey: ['vendorAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['vendorAssignment', variables.assignmentId] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Assignment updated successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to update assignment',
      });
    },
  });
};

/**
 * useDeleteVendorAssignment Mutation Hook
 * 
 * Deletes a vendor assignment
 * 
 * @returns {Object} Delete mutation
 */
export const useDeleteVendorAssignment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (assignmentId) => {
      const response = await apiClient.delete(`/vendor/assignments/${assignmentId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete assignment');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate assignments list
      queryClient.invalidateQueries({ queryKey: ['vendorAssignments'] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Assignment deleted successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to delete assignment',
      });
    },
  });
};

export default {
  useVendorAssignments,
  useVendorAssignment,
  useVendorCourses,
  useCreateVendorAssignment,
  useUpdateVendorAssignment,
  useDeleteVendorAssignment,
};
