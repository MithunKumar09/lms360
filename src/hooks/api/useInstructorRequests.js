/**
 * useInstructorRequests API Hooks (Admin)
 * 
 * React Query hooks for admin instructor request operations.
 * Provides queries and mutations for managing instructor requests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useInstructorRequestsList Query Hook
 * 
 * Fetches instructor requests list (Admin only).
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (pending, accepted, rejected)
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {Object} options - Query options
 * @returns {Object} Requests query
 */
export const useInstructorRequestsList = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  return useQuery({
    queryKey: ['instructor-requests', 'admin', params],
    queryFn: async () => {
      const response = await apiClient.get(
        `/instructor-requests?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch instructor requests');
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
 * useInstructorRequestDetail Query Hook
 * 
 * Fetches a single instructor request by ID.
 * 
 * @param {string} requestId - Request ID
 * @param {Object} options - Query options
 * @returns {Object} Request detail query
 */
export const useInstructorRequestDetail = (requestId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['instructor-requests', 'detail', requestId],
    queryFn: async () => {
      const response = await apiClient.get(`/instructor-requests/${requestId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch request details');
      }

      return response.data;
    },
    enabled: isAuthenticated && enabled && !!requestId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

/**
 * useAcceptInstructorRequest Mutation Hook
 * 
 * Accepts an instructor request.
 * 
 * @returns {Object} Accept request mutation
 */
export const useAcceptInstructorRequest = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ requestId, mfaMethod }) => {
      const response = await apiClient.patch(
        `/instructor-requests/${requestId}/accept`,
        { mfa_method: mfaMethod }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to accept instructor request');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate requests queries
      queryClient.invalidateQueries({ queryKey: ['instructor-requests'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Instructor request accepted successfully!');
      }
    },
    onError: (error) => {
      console.error('Accept instructor request error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to accept instructor request';
        createAlert('error', errorMessage);
      }
    },
  });
};

/**
 * useRejectInstructorRequest Mutation Hook
 * 
 * Rejects an instructor request.
 * 
 * @returns {Object} Reject request mutation
 */
export const useRejectInstructorRequest = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ requestId, rejectionReason }) => {
      const response = await apiClient.patch(
        `/instructor-requests/${requestId}/reject`,
        { rejection_reason: rejectionReason || null }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to reject instructor request');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate requests queries
      queryClient.invalidateQueries({ queryKey: ['instructor-requests'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Instructor request rejected');
      }
    },
    onError: (error) => {
      console.error('Reject instructor request error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to reject instructor request';
        createAlert('error', errorMessage);
      }
    },
  });
};

/**
 * useDeleteInstructorRequest Mutation Hook
 * 
 * Deletes an instructor request (only after accept/reject).
 * 
 * @returns {Object} Delete request mutation
 */
export const useDeleteInstructorRequest = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (requestId) => {
      const response = await apiClient.delete(`/instructor-requests/${requestId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete instructor request');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate requests queries
      queryClient.invalidateQueries({ queryKey: ['instructor-requests'] });
      if (onSuccess) {
        onSuccess();
      } else {
        createAlert('success', 'Request deleted successfully');
      }
    },
    onError: (error) => {
      console.error('Delete instructor request error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to delete request';
        createAlert('error', errorMessage);
      }
    },
  });
};

