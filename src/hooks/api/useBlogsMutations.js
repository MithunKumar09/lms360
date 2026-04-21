/**
 * useBlogsMutations API Hooks
 * 
 * React Query hooks for blog mutations (create, update, delete).
 * Provides mutations for blog data management with proper error handling.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useCreateBlog Mutation Hook
 * 
 * Creates a new blog post.
 * 
 * @returns {Object} Create blog mutation
 */
export const useCreateBlog = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (data) => {
      console.log('🔵 [CLIENT] [useCreateBlog] ===== CREATE STARTED =====');
      console.log('🔵 [CLIENT] [useCreateBlog] Data:', data);

      const endpoint = getEndpoint('blogs.create');
      const response = await apiClient.post(endpoint, data);

      console.log('🔵 [CLIENT] [useCreateBlog] Response:', {
        success: response.success,
        error: response.error,
        blogId: response.blog?.id,
      });

      if (!response.success) {
        console.error('🔴 [CLIENT] [useCreateBlog] Request failed:', response.error);
        throw new Error(response.error || 'Failed to create blog');
      }

      console.log('🟢 [CLIENT] [useCreateBlog] ===== CREATE SUCCESSFUL =====');
      return response;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blogs', 'home'] });
      
      createAlert('success', 'Blog created successfully!');
    },
    onError: (error) => {
      console.error('🔴 [CLIENT] [useCreateBlog] Error:', error);
      createAlert('error', 'Failed to create blog', error.message);
    },
  });
};

/**
 * useUpdateBlog Mutation Hook
 * 
 * Updates an existing blog post.
 * 
 * @returns {Object} Update blog mutation
 */
export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('🔵 [CLIENT] [useUpdateBlog] ===== UPDATE STARTED =====');
      console.log('🔵 [CLIENT] [useUpdateBlog] ID:', id);
      console.log('🔵 [CLIENT] [useUpdateBlog] Data:', data);

      const endpoint = buildEndpoint(getEndpoint('blogs.update'), { id });
      const response = await apiClient.put(endpoint, data);

      console.log('🔵 [CLIENT] [useUpdateBlog] Response:', {
        success: response.success,
        error: response.error,
        blogId: response.blog?.id,
      });

      if (!response.success) {
        console.error('🔴 [CLIENT] [useUpdateBlog] Request failed:', response.error);
        throw new Error(response.error || 'Failed to update blog');
      }

      console.log('🟢 [CLIENT] [useUpdateBlog] ===== UPDATE SUCCESSFUL =====');
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blogs', 'home'] });
      queryClient.invalidateQueries({ queryKey: ['blogs', variables.id] });
      
      createAlert('success', 'Blog updated successfully!');
    },
    onError: (error) => {
      console.error('🔴 [CLIENT] [useUpdateBlog] Error:', error);
      createAlert('error', 'Failed to update blog', error.message);
    },
  });
};

/**
 * useDeleteBlog Mutation Hook
 * 
 * Deletes a blog post.
 * 
 * @returns {Object} Delete blog mutation
 */
export const useDeleteBlog = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (id) => {
      console.log('🔵 [CLIENT] [useDeleteBlog] ===== DELETE STARTED =====');
      console.log('🔵 [CLIENT] [useDeleteBlog] ID:', id);

      const endpoint = buildEndpoint(getEndpoint('blogs.delete'), { id });
      const response = await apiClient.delete(endpoint);

      console.log('🔵 [CLIENT] [useDeleteBlog] Response:', {
        success: response.success,
        error: response.error,
      });

      if (!response.success) {
        console.error('🔴 [CLIENT] [useDeleteBlog] Request failed:', response.error);
        throw new Error(response.error || 'Failed to delete blog');
      }

      console.log('🟢 [CLIENT] [useDeleteBlog] ===== DELETE SUCCESSFUL =====');
      return response;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blogs', 'home'] });
      
      createAlert('success', 'Blog deleted successfully!');
    },
    onError: (error) => {
      console.error('🔴 [CLIENT] [useDeleteBlog] Error:', error);
      createAlert('error', 'Failed to delete blog', error.message);
    },
  });
};
