/**
 * useBulkOperations API Hooks
 * 
 * React Query hooks for bulk user operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useBulkImport Mutation Hook
 * 
 * Bulk import users from CSV/JSON data.
 */
export const useBulkImport = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ users, options = {} }) => {
      const response = await apiClient.post(
        '/users/bulk-import',
        { users, options }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to bulk import users');
      }

      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'count'] });
      
      const { succeeded, failed, total } = data.results || {};
      if (failed > 0) {
        createAlert('warning', `Bulk import completed: ${succeeded} succeeded, ${failed} failed`);
      } else {
        createAlert('success', `Successfully imported ${succeeded} user(s)`);
      }
    },
    onError: (error) => {
      console.error('Bulk import error:', error);
      createAlert('error', error.message || 'Failed to bulk import users');
    },
  });
};

/**
 * useBulkInvite Mutation Hook
 * 
 * Bulk invite users.
 */
export const useBulkInvite = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ invites, options = {} }) => {
      const response = await apiClient.post(
        '/users/bulk-invite',
        { invites, options }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to bulk invite users');
      }

      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invities', 'count'] });
      
      const { succeeded, failed, total } = data.results || {};
      if (failed > 0) {
        createAlert('warning', `Bulk invite completed: ${succeeded} succeeded, ${failed} failed`);
      } else {
        createAlert('success', `Successfully sent ${succeeded} invitation(s)`);
      }
    },
    onError: (error) => {
      console.error('Bulk invite error:', error);
      createAlert('error', error.message || 'Failed to bulk invite users');
    },
  });
};

/**
 * useBulkAction Mutation Hook
 * 
 * Perform bulk actions on users (activate, suspend, delete, assign role, etc.).
 */
export const useBulkAction = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ user_ids, action, options = {} }) => {
      const response = await apiClient.post(
        '/users/bulk-action',
        { user_ids, action, options }
      );

      if (!response.success) {
        throw new Error(response.error || `Failed to ${action} users`);
      }

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'count'] });
      
      const { succeeded, failed } = data.results || {};
      const actionLabel = variables.action.replace('_', ' ');
      
      if (failed > 0) {
        createAlert('warning', `Bulk ${actionLabel} completed: ${succeeded} succeeded, ${failed} failed`);
      } else {
        createAlert('success', `Successfully ${actionLabel} ${succeeded} user(s)`);
      }
    },
    onError: (error) => {
      console.error('Bulk action error:', error);
      createAlert('error', error.message || 'Bulk action failed');
    },
  });
};

