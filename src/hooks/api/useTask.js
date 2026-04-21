/**
 * useTask API Hooks
 * 
 * React Query hooks for individual task operations.
 * Provides queries for task details, attachments, and comments.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { buildEndpoint, getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert.js';

// Helper to get auth token for FormData uploads
const getAuthToken = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const { useAuthStore } = await import('@/store/index.js');
    return useAuthStore.getState().sessionToken;
  } catch (error) {
    return null;
  }
};

/**
 * useTask Query Hook
 * 
 * Fetches a single task by ID with full details including attachments and comments.
 * Works for both mentors and students (checks permissions on backend).
 * 
 * @param {string} taskId - Task ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Task query
 */
export const useTask = (taskId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      // Use mentor endpoint - backend will check permissions based on user role
      // For students, we'll need to modify backend to allow students to view their assigned tasks
      const response = await apiClient.get(
        buildEndpoint(getEndpoint('mentor.tasks.get'), { id: taskId })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch task');
      }

      return response.data.task;
    },
    enabled: isAuthenticated && enabled && !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

/**
 * useTaskAttachments Query Hook
 * 
 * Fetches attachments for a task.
 * 
 * @param {string} taskId - Task ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Attachments query
 */
export const useTaskAttachments = (taskId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      const endpoint = buildEndpoint(getEndpoint('mentor.tasks.attachments.list'), { id: taskId });
      const response = await apiClient.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch attachments');
      }

      return response.data.attachments;
    },
    enabled: isAuthenticated && enabled && !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

/**
 * useUploadTaskAttachment Mutation Hook
 * 
 * Uploads an attachment to a task.
 * 
 * @returns {Object} Upload attachment mutation
 */
export const useUploadTaskAttachment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ taskId, file }) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.tasks.attachments.upload'), { id: taskId });
      
      const formData = new FormData();
      formData.append('file', file);

      // Use fetch directly for FormData
      const token = await getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to upload attachment');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate attachments query
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      // Invalidate task query to refresh task details
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      
      createAlert('success', 'Attachment uploaded successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to upload attachment');
    },
  });
};

/**
 * useDeleteTaskAttachment Mutation Hook
 * 
 * Deletes an attachment from a task.
 * 
 * @returns {Object} Delete attachment mutation
 */
export const useDeleteTaskAttachment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ taskId, attachmentId }) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.tasks.attachments.delete'), { 
        id: taskId,
        attachmentId: attachmentId,
      });
      
      const response = await apiClient.delete(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete attachment');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate attachments query
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      // Invalidate task query
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      
      createAlert('success', 'Attachment deleted successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete attachment');
    },
  });
};

/**
 * useTaskComments Query Hook
 * 
 * Fetches comments for a task.
 * 
 * @param {string} taskId - Task ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Comments query
 */
export const useTaskComments = (taskId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const endpoint = buildEndpoint(getEndpoint('mentor.tasks.comments.list'), { id: taskId });
      const response = await apiClient.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch comments');
      }

      return response.data.comments;
    },
    enabled: isAuthenticated && enabled && !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

/**
 * useAddTaskComment Mutation Hook
 * 
 * Adds a comment to a task.
 * 
 * @returns {Object} Add comment mutation
 */
export const useAddTaskComment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ taskId, comment }) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.tasks.comments.add'), { id: taskId });
      
      const response = await apiClient.post(endpoint, { comment });

      if (!response.success) {
        throw new Error(response.error || 'Failed to add comment');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate comments query
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
      // Invalidate task query
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      
      createAlert('success', 'Comment added successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to add comment');
    },
  });
};
