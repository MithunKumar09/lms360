/**
 * useInvities API Hooks
 * 
 * React Query hooks for invited users operations.
 * Provides queries for fetching invited users (accepted and not accepted).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useInvitiesStore from '@/store/invitiesStore.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useInvities Query Hook
 * 
 * Fetches list of invited users (both accepted and not accepted) with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (page, pageSize, q, status, etc.)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Invities query
 */
export const useInvities = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['invities', 'list', filters],
    queryFn: async ({ queryKey }) => {
      // Get ETag from query cache if available
      let etag = null;
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData?.etag) {
        etag = cachedData.etag;
      }

      const response = await apiClient.get(
        getEndpoint('invities.list'),
        filters,
        etag
      );

      if (response.notModified) {
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData) {
          return cachedData;
        }
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch invited users');
      }

      return {
        items: response.items || [],
        total: response.total || 0,
        etag: response.etag,
      };
    },
    enabled: isAuthenticated && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });
};

/**
 * useInvitiesCount Query Hook
 * 
 * Fetches the count of pending invites.
 * Uses React Query for caching and Zustand for UI state management.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Invities count query
 */
export const useInvitiesCount = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pendingCount, setPendingCount, setCountFetching, shouldRefreshCount } = useInvitiesStore();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['invities', 'count'],
    queryFn: async () => {
      setCountFetching(true);
      try {
        const response = await apiClient.get(
          getEndpoint('invities.list'),
          { page: '1', pageSize: '1' } // Only need count, so minimal data
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch invite count');
        }

        const count = response.total || 0;
        setPendingCount(count);
        return count;
      } finally {
        setCountFetching(false);
      }
    },
    enabled: isAuthenticated && enabled && shouldRefreshCount(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    // Use placeholder data from Zustand store to avoid showing 0 while loading
    placeholderData: pendingCount > 0 ? pendingCount : undefined,
  });

  // Update Zustand store when query data changes
  useEffect(() => {
    if (query.data !== undefined && query.data !== pendingCount) {
      setPendingCount(query.data);
    }
  }, [query.data, pendingCount, setPendingCount]);

  // Return count from query if available, otherwise from Zustand store
  const count = query.data !== undefined ? query.data : pendingCount;

  return {
    ...query,
    data: count,
    count: count,
  };
};

/**
 * useDeleteInvite Mutation Hook
 * 
 * Deletes an invite token.
 * 
 * @returns {Object} Delete invite mutation
 */
export const useDeleteInvite = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { setPendingCount } = useInvitiesStore();

  return useMutation({
    mutationFn: async (inviteId) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('invities.delete'), { id: inviteId })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete invite');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate and refetch invites list
      queryClient.invalidateQueries({ queryKey: ['invities', 'list'] });
      // Invalidate count
      queryClient.invalidateQueries({ queryKey: ['invities', 'count'] });
      // Update count in Zustand store
      const currentCount = useInvitiesStore.getState().pendingCount;
      if (currentCount > 0) {
        setPendingCount(Math.max(0, currentCount - 1));
      }
      createAlert('success', 'Invite deleted successfully');
    },
    onError: (error) => {
      console.error('Delete invite error:', error);
      createAlert('error', error.message || 'Failed to delete invite');
    },
  });
};

