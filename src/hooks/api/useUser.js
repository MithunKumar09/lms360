/**
 * useUser API Hooks
 * 
 * React Query hooks for user operations.
 * Provides queries and mutations for user data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useUser Query Hook
 * 
 * Fetches current user information.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} User query
 */
export const useUser = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await apiClient.get(getEndpoint('user.profile'));

      if (!response.success) {
        throw new Error(response.error || 'Failed to get user');
      }

      // Return response data (user, etc.)
      return response;
    },
    enabled: isAuthenticated && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

/**
 * useUpdateUser Mutation Hook
 * 
 * Updates user information with optimistic updates.
 * 
 * @returns {Object} Update user mutation
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (userData) => {
      const response = await apiClient.put(getEndpoint('user.update'), userData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update user');
      }

      // Return response data (user, etc.)
      return response;
    },
    onMutate: async (newUserData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['user'] });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(['user']);

      // Optimistically update to the new value
      if (previousUser?.user) {
        queryClient.setQueryData(['user'], {
          ...previousUser,
          user: {
            ...previousUser.user,
            ...newUserData,
          },
        });
      }

      // Return a context object with the snapshotted value
      return { previousUser };
    },
    onError: (error, newUserData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(['user'], context.previousUser);
      }
      console.error('Update user error:', error);
      createAlert('error', error.message || 'Failed to update user');
    },
    onSuccess: (data) => {
      // Update auth store
      if (data.user) {
        updateUser(data.user);
      }

      // Invalidate and refetch user query to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // Show success message
      createAlert('success', 'Profile updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

/**
 * useChangePassword Mutation Hook
 * 
 * Changes user password.
 * 
 * @returns {Object} Change password mutation
 */
export const useChangePassword = () => {
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await apiClient.post(getEndpoint('user.changePassword'), {
        currentPassword,
        newPassword,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to change password');
      }

      // Return response data
      return response;
    },
    onSuccess: () => {
      createAlert('success', 'Password changed successfully');
    },
    onError: (error) => {
      console.error('Change password error:', error);
      createAlert('error', error.message || 'Failed to change password');
    },
  });
};

/**
 * useSocialLinks Query Hook
 * 
 * Fetches user's social media links.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Social links query
 */
export const useSocialLinks = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['user', 'social-links'],
    queryFn: async () => {
      const response = await apiClient.get(getEndpoint('user.socialLinks'));

      if (!response.success) {
        throw new Error(response.error || 'Failed to get social links');
      }

      return response;
    },
    enabled: isAuthenticated && (options.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for settings
    refetchOnReconnect: true,
  });
};

/**
 * useUpdateSocialLinks Mutation Hook
 * 
 * Updates user's social media links.
 * 
 * @returns {Object} Update social links mutation
 */
export const useUpdateSocialLinks = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (socialLinks) => {
      const response = await apiClient.put(getEndpoint('user.socialLinks'), socialLinks);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update social links');
      }

      return response;
    },
    onMutate: async (newSocialLinks) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', 'social-links'] });

      // Snapshot the previous value
      const previousSocialLinks = queryClient.getQueryData(['user', 'social-links']);

      // Optimistically update
      queryClient.setQueryData(['user', 'social-links'], {
        success: true,
        socialLinks: newSocialLinks,
      });

      return { previousSocialLinks };
    },
    onError: (error, newSocialLinks, context) => {
      // Rollback on error
      if (context?.previousSocialLinks) {
        queryClient.setQueryData(['user', 'social-links'], context.previousSocialLinks);
      }
      console.error('Update social links error:', error);
      createAlert('error', error.message || 'Failed to update social links');
    },
    onSuccess: () => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['user', 'social-links'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      createAlert('success', 'Social links updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['user', 'social-links'] });
    },
  });
};

export default {
  useUser,
  useUpdateUser,
  useChangePassword,
  useSocialLinks,
  useUpdateSocialLinks,
};

