/**
 * useNotifications API Hooks
 * 
 * React Query hooks for notification operations.
 * Provides queries and mutations for notifications.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useNotifications Query Hook
 * 
 * Fetches user notifications with filters and pagination.
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {boolean} params.read - Filter by read status
 * @param {string} params.type - Filter by notification type
 * @param {string} params.start_date - Start date filter
 * @param {string} params.end_date - End date filter
 * @param {Object} options - Query options
 * @returns {Object} Notifications query
 */
export const useNotifications = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.read !== undefined) queryParams.append('read', params.read);
  if (params.type) queryParams.append('type', params.type);
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);

  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const response = await apiClient.get(
        `/notifications?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }

      return response.data;
    },
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Poll every minute for real-time updates
    retry: 1,
  });
};

/**
 * useMarkNotificationRead Mutation Hook
 * 
 * Marks a notification as read.
 * 
 * @returns {Object} Mark as read mutation
 */
export const useMarkNotificationRead = (options = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.patch(
        `/notifications/${notificationId}/read`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Mark notification read error:', error);
      if (onError) onError(error);
    },
  });
};

/**
 * useMarkAllNotificationsRead Mutation Hook
 * 
 * Marks all notifications as read.
 * 
 * @returns {Object} Mark all as read mutation
 */
export const useMarkAllNotificationsRead = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/notifications/read-all');

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'All notifications marked as read');
      }
    },
    onError: (error) => {
      console.error('Mark all notifications read error:', error);
      if (onError) {
        onError(error);
      } else {
        createAlert('error', error.message || 'Failed to mark all as read');
      }
    },
  });
};

/**
 * useDeleteNotification Mutation Hook
 * 
 * Deletes a notification.
 * 
 * @returns {Object} Delete notification mutation
 */
export const useDeleteNotification = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.delete(`/notifications/${notificationId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete notification');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (onSuccess) {
        onSuccess();
      } else {
        createAlert('success', 'Notification deleted');
      }
    },
    onError: (error) => {
      console.error('Delete notification error:', error);
      if (onError) {
        onError(error);
      } else {
        createAlert('error', error.message || 'Failed to delete notification');
      }
    },
  });
};

