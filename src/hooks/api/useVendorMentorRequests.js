/**
 * useVendorMentorRequests API Hooks (Superadmin)
 * 
 * React Query hooks for superadmin vendor/mentor registration request operations.
 * Provides queries and mutations for managing registration requests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useVendorRequestsList Query Hook
 * 
 * Fetches vendor registration requests list (Superadmin only).
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (pending, approved, rejected)
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search query
 * @param {Object} options - Query options
 * @returns {Object} Requests query
 */
export const useVendorRequestsList = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);

  return useQuery({
    queryKey: ['vendor-requests', params],
    queryFn: async () => {
      const response = await apiClient.get(
        `/registration-requests/vendors?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch vendor requests');
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
 * useMentorRequestsList Query Hook
 * 
 * Fetches mentor registration requests list (Superadmin only).
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (pending, approved, rejected)
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search query
 * @param {Object} options - Query options
 * @returns {Object} Requests query
 */
export const useMentorRequestsList = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);

  return useQuery({
    queryKey: ['mentor-requests', params],
    queryFn: async () => {
      const response = await apiClient.get(
        `/registration-requests/mentors?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch mentor requests');
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
 * useAcceptRegistrationRequest Mutation Hook
 * 
 * Accepts a registration request (vendor or mentor).
 * 
 * @param {Object} options - Mutation options
 * @returns {Object} Accept request mutation
 */
export const useAcceptRegistrationRequest = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ requestId, organizationIds, rejectionReason }) => {
      const payload = {};
      if (organizationIds) payload.organization_ids = organizationIds;
      if (rejectionReason) payload.rejection_reason = rejectionReason;

      const response = await apiClient.post(
        `/registration-requests/${requestId}/accept`,
        payload
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to accept registration request');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate requests queries
      queryClient.invalidateQueries({ queryKey: ['vendor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-requests'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Registration request accepted successfully!');
      }
    },
    onError: (error) => {
      console.error('Accept registration request error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to accept registration request';
        createAlert('error', errorMessage);
      }
    },
  });
};

/**
 * useRejectRegistrationRequest Mutation Hook
 * 
 * Rejects a registration request (vendor or mentor).
 * 
 * @param {Object} options - Mutation options
 * @returns {Object} Reject request mutation
 */
export const useRejectRegistrationRequest = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ requestId, rejectionReason }) => {
      const response = await apiClient.post(
        `/registration-requests/${requestId}/reject`,
        { rejection_reason: rejectionReason || null }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to reject registration request');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate requests queries
      queryClient.invalidateQueries({ queryKey: ['vendor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-requests'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Registration request rejected');
      }
    },
    onError: (error) => {
      console.error('Reject registration request error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to reject registration request';
        createAlert('error', errorMessage);
      }
    },
  });
};

