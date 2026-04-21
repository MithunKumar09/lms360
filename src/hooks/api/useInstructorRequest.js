/**
 * useInstructorRequest API Hooks
 * 
 * React Query hooks for instructor request operations.
 * Provides queries and mutations for instructor requests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useMyInstructorRequest Query Hook
 * 
 * Fetches current user's instructor request status.
 * 
 * @param {Object} options - Query options
 * @returns {Object} Request query
 */
export const useMyInstructorRequest = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['instructor-requests', 'my-request'],
    queryFn: async () => {
      const response = await apiClient.get('/instructor-requests/my-request');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch request');
      }

      return response.data;
    },
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

/**
 * useCreateInstructorRequest Mutation Hook
 * 
 * Creates a new instructor request.
 * 
 * @returns {Object} Create request mutation
 */
export const useCreateInstructorRequest = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(
        '/instructor-requests',
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create instructor request');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate my request query
      queryClient.invalidateQueries({ queryKey: ['instructor-requests', 'my-request'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Instructor request submitted successfully!');
      }
    },
    onError: (error) => {
      console.error('Create instructor request error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to submit instructor request';
        createAlert('error', errorMessage);
      }
    },
  });
};

