/**
 * useUsers API Hooks
 * 
 * React Query hooks for users management operations.
 * Provides queries and mutations for users data with proper caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import useUsersCountStore from '@/store/usersCountStore.js';

/**
 * useUsers Query Hook
 * 
 * Fetches list of users with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (page, pageSize, q, role, status, etc.)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Users query
 */
export const useUsers = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['users', 'list', filters],
    queryFn: async ({ queryKey }) => {
      // Get ETag from query cache if available
      let etag = null;
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData?.etag) {
        etag = cachedData.etag;
      }

      const response = await apiClient.get(
        getEndpoint('users.list'),
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
        throw new Error(response.error || 'Failed to fetch users');
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
    // Mark as critical query for preloader tracking
    meta: { isCritical: true },
  });
};

/**
 * useUser Query Hook
 * 
 * Fetches a single user by ID.
 * 
 * @param {string} id - User ID
 * @param {Object} options - Query options
 * @returns {Object} User query
 */
export const useUser = (id, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: async ({ queryKey, meta }) => {
      if (!id) return null;

      const previousData = meta?.previousData;
      const etag = previousData?.etag || null;

      const response = await apiClient.get(
        buildEndpoint(getEndpoint('users.get'), { id }),
        {},
        etag
      );

      if (response.notModified && previousData) {
        return previousData;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user');
      }

      return {
        user: response.user || null,
        etag: response.etag,
      };
    },
    enabled: isAuthenticated && enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * useCreateUser Mutation Hook
 * 
 * Creates a new user.
 * 
 * @returns {Object} Create user mutation
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (userData) => {
      const response = await apiClient.post(
        getEndpoint('users.create'),
        userData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create user');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      createAlert('success', 'User created successfully');
    },
    onError: (error) => {
      console.error('Create user error:', error);
      createAlert('error', error.message || 'Failed to create user');
    },
  });
};

/**
 * useUpdateUser Mutation Hook
 * 
 * Updates an existing user.
 * 
 * @returns {Object} Update user mutation
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ id, ...userData }) => {
      const response = await apiClient.patch(
        buildEndpoint(getEndpoint('users.update'), { id }),
        userData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update user');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', variables.id] });
      createAlert('success', 'User updated successfully');
    },
    onError: (error) => {
      console.error('Update user error:', error);
      createAlert('error', error.message || 'Failed to update user');
    },
  });
};

/**
 * useDeleteUser Mutation Hook
 * 
 * Deletes a user.
 * 
 * @returns {Object} Delete user mutation
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (id) => {
      console.log('🗑️ [DELETE HOOK] ===== DELETE MUTATION STARTED =====');
      console.log('🗑️ [DELETE HOOK] User ID to delete:', id);
      console.log('🗑️ [DELETE HOOK] Building endpoint...');
      
      const endpoint = buildEndpoint(getEndpoint('users.delete'), { id });
      console.log('🗑️ [DELETE HOOK] Endpoint:', endpoint);
      console.log('🗑️ [DELETE HOOK] Making DELETE request...');
      
      const response = await apiClient.delete(endpoint);
      
      console.log('🗑️ [DELETE HOOK] Response received:', {
        success: response.success,
        error: response.error,
        message: response.message,
        data: response.data
      });

      if (!response.success) {
        console.error('🗑️ [DELETE HOOK] ❌ Delete failed - response.success is false');
        console.error('🗑️ [DELETE HOOK] Error:', response.error);
        throw new Error(response.error || 'Failed to delete user');
      }

      console.log('🗑️ [DELETE HOOK] ✅ Delete successful');
      console.log('🗑️ [DELETE HOOK] Returning result:', { id, ...response });
      return { id, ...response };
    },
    onMutate: async (id) => {
      console.log('🗑️ [DELETE HOOK] onMutate - Optimistic update starting...');
      console.log('🗑️ [DELETE HOOK] User ID:', id);
      
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      console.log('🗑️ [DELETE HOOK] Cancelling outgoing queries...');
      await queryClient.cancelQueries({ queryKey: ['users', 'list'] });

      // Snapshot the previous values for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: ['users', 'list'] });
      console.log('🗑️ [DELETE HOOK] Snapshot saved for rollback');

      // Optimistically update cache - remove user from all list queries
      console.log('🗑️ [DELETE HOOK] Updating cache optimistically...');
      queryClient.setQueriesData({ queryKey: ['users', 'list'] }, (old) => {
        if (!old || !old.items) {
          console.log('🗑️ [DELETE HOOK] No old data to update');
          return old;
        }
        const newItems = old.items.filter((u) => u.id !== id);
        const newTotal = Math.max(0, (old.total || 0) - 1);
        console.log('🗑️ [DELETE HOOK] Cache updated - Items:', old.items.length, '->', newItems.length);
        console.log('🗑️ [DELETE HOOK] Cache updated - Total:', old.total, '->', newTotal);
        return {
          ...old,
          items: newItems,
          total: newTotal,
        };
      });

      // Return context with snapshot for rollback
      return { previousQueries };
    },
    onSuccess: (data, id) => {
      console.log('🗑️ [DELETE HOOK] ===== DELETE SUCCESS =====');
      console.log('🗑️ [DELETE HOOK] Success data:', data);
      console.log('🗑️ [DELETE HOOK] Deleted user ID:', id);
      console.log('🗑️ [DELETE HOOK] User should be permanently deleted from database');
      
      // Remove user detail from cache
      console.log('🗑️ [DELETE HOOK] Removing user detail from cache...');
      queryClient.removeQueries({ queryKey: ['users', 'detail', id] });
      
      // Stagger invalidations to prevent connection pool exhaustion
      // Invalidate main list first (most important)
      console.log('🗑️ [DELETE HOOK] Invalidating users list query...');
      queryClient.invalidateQueries({ 
        queryKey: ['users', 'list'],
        exact: false,
        refetchType: 'active'
      });
      
      // Delay other invalidations slightly to avoid simultaneous connections
      setTimeout(() => {
        console.log('🗑️ [DELETE HOOK] Invalidating users count query...');
        queryClient.invalidateQueries({ 
          queryKey: ['users', 'count'],
          exact: false,
          refetchType: 'active'
        });
      }, 100);
      
      setTimeout(() => {
        console.log('🗑️ [DELETE HOOK] Invalidating invities count query...');
        queryClient.invalidateQueries({ 
          queryKey: ['invities', 'count'],
          exact: false,
          refetchType: 'active'
        });
      }, 200);
      
      console.log('🗑️ [DELETE HOOK] Showing success alert...');
      createAlert('success', 'User deleted successfully');
      console.log('🗑️ [DELETE HOOK] ===== DELETE SUCCESS COMPLETE =====');
    },
    onError: (error, id, context) => {
      console.error('🗑️ [DELETE HOOK] ===== DELETE ERROR =====');
      console.error('🗑️ [DELETE HOOK] Error occurred for user ID:', id);
      console.error('🗑️ [DELETE HOOK] Error:', error);
      console.error('🗑️ [DELETE HOOK] Error message:', error.message);
      console.error('🗑️ [DELETE HOOK] Error stack:', error.stack);
      
      // Rollback optimistic update on error
      if (context?.previousQueries) {
        console.log('🗑️ [DELETE HOOK] Rolling back optimistic update...');
        context.previousQueries.forEach(([queryKey, data]) => {
          if (data !== undefined) {
            queryClient.setQueryData(queryKey, data);
            console.log('🗑️ [DELETE HOOK] Rolled back query:', queryKey);
          }
        });
      }
      
      console.error('🗑️ [DELETE HOOK] Showing error alert...');
      createAlert('error', error.message || 'Failed to delete user');
      console.error('🗑️ [DELETE HOOK] ===== DELETE ERROR COMPLETE =====');
    },
  });
};

/**
 * useUserAction Mutation Hook
 * 
 * Performs actions on users (suspend, activate, toggle MFA, etc.).
 * 
 * @returns {Object} User action mutation
 */
export const useUserAction = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ id, action, ...body }) => {
      console.log('🔄 [CLIENT] ===== USER ACTION MUTATION STARTED =====');
      console.log('🔄 [CLIENT] User ID:', id);
      console.log('🔄 [CLIENT] Action:', action);
      console.log('🔄 [CLIENT] Body:', body);
      
      const endpoint = buildEndpoint(getEndpoint('users.update'), { id });
      console.log('🔄 [CLIENT] Request endpoint:', endpoint);
      console.log('🔄 [CLIENT] Request method: PATCH');
      console.log('🔄 [CLIENT] Request payload:', { action, ...body });

      try {
        const response = await apiClient.patch(
          endpoint,
          { action, ...body }
        );

        console.log('🔄 [CLIENT] Response received:', {
          success: response.success,
          error: response.error,
          ok: response.ok,
        });

        if (!response.success) {
          const errorMsg = response.error || `Failed to ${action} user`;
          console.error('🔄 [CLIENT] ❌ Request failed:', errorMsg);
          console.error('🔄 [CLIENT] Error response:', response);
          throw new Error(errorMsg);
        }

        console.log('🔄 [CLIENT] ✅ Request successful');
        return response;
      } catch (error) {
        console.error('🔄 [CLIENT] ❌ Mutation function error:', error);
        console.error('🔄 [CLIENT] Error message:', error.message);
        console.error('🔄 [CLIENT] Error stack:', error.stack);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('🔄 [CLIENT] ===== USER ACTION SUCCESS =====');
      console.log('🔄 [CLIENT] Success data:', data);
      console.log('🔄 [CLIENT] Variables:', variables);
      
      // Optimistically update cache
      console.log('🔄 [CLIENT] Updating cache optimistically...');
      queryClient.setQueryData(['users', 'list'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items?.map((u) =>
            u.id === variables.id
              ? {
                  ...u,
                  ...(variables.action === 'suspend' && { status: 'suspended' }),
                  ...(variables.action === 'activate' && { status: 'active' }),
                  ...(variables.action === 'revoke_sessions' && { active_sessions: 0 }),
                  ...(variables.action === 'toggle_mfa' && { mfa_required: variables.enable }),
                }
              : u
          ),
        };
      });
      console.log('🔄 [CLIENT] ✅ Cache updated');
      
      console.log('🔄 [CLIENT] Invalidating user detail query...');
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', variables.id] });
      
      // Invalidate user counts if verification status might have changed
      if (variables.action === 'resend_invite' || variables.action === 'force_reset_password') {
        queryClient.invalidateQueries({ queryKey: ['users', 'count'] });
      }
      
      const successMessage = `User ${variables.action} completed successfully`;
      console.log('🔄 [CLIENT] Showing success alert:', successMessage);
      createAlert('success', successMessage);
    },
    onError: (error) => {
      console.error('🔄 [CLIENT] ❌ ===== USER ACTION ERROR =====');
      console.error('🔄 [CLIENT] Error:', error);
      console.error('🔄 [CLIENT] Error message:', error.message);
      console.error('🔄 [CLIENT] Error stack:', error.stack);
      console.error('🔄 [CLIENT] Error name:', error.name);
      
      const errorMessage = error.message || 'Action failed';
      console.log('🔄 [CLIENT] Showing error alert:', errorMessage);
      createAlert('error', errorMessage);
    },
  });
};

/**
 * useVerifiedUsersCount Query Hook
 * 
 * Fetches the count of verified users.
 * Uses React Query for caching and Zustand for UI state management.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Verified users count query
 */
export const useVerifiedUsersCount = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { verifiedCount, setVerifiedCount, setVerifiedCountFetching, shouldRefreshVerifiedCount } = useUsersCountStore();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['users', 'count', 'verified'],
    queryFn: async () => {
      setVerifiedCountFetching(true);
      try {
        const response = await apiClient.get(
          getEndpoint('users.list'),
          { page: '1', pageSize: '1', verified: 'true' } // Only need count
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch verified users count');
        }

        const count = response.total || 0;
        setVerifiedCount(count);
        return count;
      } finally {
        setVerifiedCountFetching(false);
      }
    },
    enabled: isAuthenticated && enabled && shouldRefreshVerifiedCount(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: verifiedCount > 0 ? verifiedCount : undefined,
  });

  // Update Zustand store when query data changes
  useEffect(() => {
    if (query.data !== undefined && query.data !== verifiedCount) {
      setVerifiedCount(query.data);
    }
  }, [query.data, verifiedCount, setVerifiedCount]);

  const count = query.data !== undefined ? query.data : verifiedCount;

  return {
    ...query,
    data: count,
    count: count,
  };
};

/**
 * useUnverifiedUsersCount Query Hook
 * 
 * Fetches the count of unverified users.
 * Uses React Query for caching and Zustand for UI state management.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Unverified users count query
 */
export const useUnverifiedUsersCount = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { unverifiedCount, setUnverifiedCount, setUnverifiedCountFetching, shouldRefreshUnverifiedCount } = useUsersCountStore();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['users', 'count', 'unverified'],
    queryFn: async () => {
      setUnverifiedCountFetching(true);
      try {
        const response = await apiClient.get(
          getEndpoint('users.list'),
          { page: '1', pageSize: '1', verified: 'false' } // Only need count
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch unverified users count');
        }

        const count = response.total || 0;
        setUnverifiedCount(count);
        return count;
      } finally {
        setUnverifiedCountFetching(false);
      }
    },
    enabled: isAuthenticated && enabled && shouldRefreshUnverifiedCount(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: unverifiedCount > 0 ? unverifiedCount : undefined,
  });

  // Update Zustand store when query data changes
  useEffect(() => {
    if (query.data !== undefined && query.data !== unverifiedCount) {
      setUnverifiedCount(query.data);
    }
  }, [query.data, unverifiedCount, setUnverifiedCount]);

  const count = query.data !== undefined ? query.data : unverifiedCount;

  return {
    ...query,
    data: count,
    count: count,
  };
};

