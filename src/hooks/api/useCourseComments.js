/**
 * useCourseComments API Hook
 * 
 * React Query hooks for course comments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useCourseComments Query Hook
 * 
 * Fetches comments for a course with pagination
 * 
 * @param {string} courseId - Course ID
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.page - Page number
 * @param {number} options.limit - Comments per page
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Comments query
 */
export const useCourseComments = (courseId, options = {}) => {
  const { status = null, page = 1, limit = 20, enabled = true } = options;

  return useQuery({
    queryKey: ['courseComments', courseId, status, page, limit],
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required');
      }
      let url = `/courses/${courseId}/comments?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch comments');
      }
      return response;
    },
    enabled: enabled && !!courseId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useCreateCourseComment Mutation Hook
 * 
 * Creates a new comment
 * 
 * @returns {Object} Create comment mutation
 */
export const useCreateCourseComment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ courseId, commentText, parentId }) => {
      if (!courseId || !commentText) {
        throw new Error('Course ID and comment text are required');
      }
      if (commentText.trim().length === 0) {
        throw new Error('Comment text cannot be empty');
      }
      if (commentText.trim().length > 5000) {
        throw new Error('Comment text must be less than 5000 characters');
      }

      const url = `/courses/${courseId}/comments`;
      const response = await apiClient.post(url, {
        commentText: commentText.trim(),
        parentId: parentId || null
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create comment');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: variables.parentId 
          ? 'Reply submitted successfully. It will be visible after approval.' 
          : 'Comment submitted successfully. It will be visible after approval.'
      });
      // Invalidate and refetch comments for this course
      queryClient.invalidateQueries({ queryKey: ['courseComments', variables.courseId] });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit comment'
      });
    },
  });
};

/**
 * useUpdateCourseComment Mutation Hook
 * 
 * Updates a comment
 * 
 * @returns {Object} Update comment mutation
 */
export const useUpdateCourseComment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ courseId, commentId, commentText, status }) => {
      if (!courseId || !commentId) {
        throw new Error('Course ID and comment ID are required');
      }

      const body = {};
      if (commentText !== undefined) {
        if (commentText.trim().length === 0) {
          throw new Error('Comment text cannot be empty');
        }
        if (commentText.trim().length > 5000) {
          throw new Error('Comment text must be less than 5000 characters');
        }
        body.commentText = commentText.trim();
      }
      if (status !== undefined) {
        body.status = status;
      }

      if (Object.keys(body).length === 0) {
        throw new Error('No updates provided');
      }

      const url = `/courses/${courseId}/comments/${commentId}`;
      const response = await apiClient.put(url, body);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update comment');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Comment updated successfully'
      });
      // Invalidate and refetch comments
      queryClient.invalidateQueries({ queryKey: ['courseComments', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['allCourseComments'] });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update comment'
      });
    },
  });
};

/**
 * useDeleteCourseComment Mutation Hook
 * 
 * Deletes a comment
 * 
 * @returns {Object} Delete comment mutation
 */
export const useDeleteCourseComment = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ courseId, commentId }) => {
      if (!courseId || !commentId) {
        throw new Error('Course ID and comment ID are required');
      }

      const url = `/courses/${courseId}/comments/${commentId}`;
      const response = await apiClient.delete(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete comment');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      createAlert({
        icon: 'success',
        title: 'Deleted!',
        text: 'Comment has been deleted.'
      });
      // Invalidate and refetch comments
      queryClient.invalidateQueries({ queryKey: ['courseComments', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['allCourseComments'] });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to delete comment'
      });
    },
  });
};

/**
 * useAllCourseComments Query Hook (Admin/Superadmin)
 * 
 * Fetches all comments across all courses
 * 
 * @param {Object} options - Query options
 * @param {string} options.courseId - Filter by course ID
 * @param {string} options.status - Filter by status
 * @param {number} options.page - Page number
 * @param {number} options.limit - Comments per page
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} All comments query
 */
export const useAllCourseComments = (options = {}) => {
  const { courseId = null, status = null, page = 1, limit = 20, enabled = true } = options;

  return useQuery({
    queryKey: ['allCourseComments', courseId, status, page, limit],
    queryFn: async () => {
      let url = `/courses/comments?page=${page}&limit=${limit}`;
      if (courseId) {
        url += `&courseId=${courseId}`;
      }
      if (status) {
        url += `&status=${status}`;
      }
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch comments');
      }
      return response;
    },
    enabled: enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

