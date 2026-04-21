/**
 * Vendor Quizzes API Hooks
 * 
 * React Query hooks for vendor quiz operations.
 * Provides queries and mutations for vendor's quizzes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useVendorQuizzes Query Hook
 * 
 * Fetches vendor's quizzes
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.courseId - Filter by course ID
 * @param {string} options.status - Filter by status
 * @param {string} options.search - Search in title
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Quizzes query
 */
export const useVendorQuizzes = (options = {}) => {
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
    queryKey: ['vendorQuizzes', user?.id, page, limit, courseId, status, search],
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

      const response = await apiClient.get(`/vendor/quizzes?${queryParams.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quizzes');
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
 * useVendorQuiz Query Hook
 * 
 * Fetches a single vendor quiz
 * 
 * @param {string} quizId - Quiz ID
 * @param {Object} options - Query options
 * @returns {Object} Quiz query
 */
export const useVendorQuiz = (quizId, options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorQuiz', quizId, user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!quizId) {
        throw new Error('Quiz ID is required');
      }

      const response = await apiClient.get(`/vendor/quizzes/${quizId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quiz');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!quizId,
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
 * useVendorCoursesForQuiz Hook
 * 
 * Fetches vendor's published courses for quiz creation
 * 
 * @param {Object} options - Query options
 * @returns {Object} Courses query
 */
export const useVendorCoursesForQuiz = (options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorCoursesForQuiz', user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/vendor/quizzes/courses');

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
 * useCreateVendorQuiz Mutation Hook
 * 
 * Creates a new quiz for vendor's course
 * 
 * @returns {Object} Create mutation
 */
export const useCreateVendorQuiz = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/vendor/quizzes', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create quiz');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate quizzes list
      queryClient.invalidateQueries({ queryKey: ['vendorQuizzes'] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Quiz created successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to create quiz',
      });
    },
  });
};

/**
 * useUpdateVendorQuiz Mutation Hook
 * 
 * Updates an existing vendor quiz
 * 
 * @returns {Object} Update mutation
 */
export const useUpdateVendorQuiz = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ quizId, data }) => {
      const response = await apiClient.put(`/vendor/quizzes/${quizId}`, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update quiz');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate quizzes list and specific quiz
      queryClient.invalidateQueries({ queryKey: ['vendorQuizzes'] });
      queryClient.invalidateQueries({ queryKey: ['vendorQuiz', variables.quizId] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Quiz updated successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to update quiz',
      });
    },
  });
};

/**
 * useDeleteVendorQuiz Mutation Hook
 * 
 * Deletes a vendor quiz
 * 
 * @returns {Object} Delete mutation
 */
export const useDeleteVendorQuiz = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (quizId) => {
      const response = await apiClient.delete(`/vendor/quizzes/${quizId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete quiz');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate quizzes list
      queryClient.invalidateQueries({ queryKey: ['vendorQuizzes'] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Quiz deleted successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to delete quiz',
      });
    },
  });
};

export default {
  useVendorQuizzes,
  useVendorQuiz,
  useVendorCoursesForQuiz,
  useCreateVendorQuiz,
  useUpdateVendorQuiz,
  useDeleteVendorQuiz,
};
