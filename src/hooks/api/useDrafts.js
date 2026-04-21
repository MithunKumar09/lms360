/**
 * Draft Hooks
 * 
 * React Query hooks for course draft operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';

/**
 * Get user's latest draft
 */
export const useLatestDraft = (options = {}) => {
  return useQuery({
    queryKey: ['drafts', 'latest'],
    queryFn: async () => {
      const response = await apiClient.get(
        `${getEndpoint('drafts.list')}?latest=true`
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch latest draft');
      }
      return response.draft;
    },
    enabled: options.enabled ?? true,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if no draft found
  });
};

/**
 * Get all user drafts
 */
export const useDrafts = (params = {}, options = {}) => {
  const { limit = 20, offset = 0 } = params;

  return useQuery({
    queryKey: ['drafts', 'list', { limit, offset }],
    queryFn: async () => {
      const response = await apiClient.get(
        `${getEndpoint('drafts.list')}?limit=${limit}&offset=${offset}`
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch drafts');
      }
      return {
        drafts: response.drafts || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get specific draft by ID
 */
export const useDraft = (draftId, options = {}) => {
  return useQuery({
    queryKey: ['drafts', draftId],
    queryFn: async () => {
      if (!draftId) return null;
      
      const response = await apiClient.get(
        getEndpoint('drafts.get', { id: draftId })
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch draft');
      }
      return response;
    },
    enabled: (options.enabled ?? true) && !!draftId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Save/create draft mutation
 */
export const useSaveDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, courseData, courseId = null }) => {
      const response = await apiClient.post(getEndpoint('drafts.create'), {
        id,
        courseData,
        courseId,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to save draft');
      }
      return response;
    },
    onSuccess: (data) => {
      // Invalidate and refetch drafts
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      
      // Update latest draft cache
      queryClient.setQueryData(['drafts', 'latest'], { draft: data });
      
      // Update specific draft cache if ID exists
      if (data.id) {
        queryClient.setQueryData(['drafts', data.id], data);
      }
    },
  });
};

/**
 * Update draft mutation
 */
export const useUpdateDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftId, courseData }) => {
      const response = await apiClient.put(
        getEndpoint('drafts.update', { id: draftId }),
        { courseData }
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to update draft');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch drafts
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      
      // Update specific draft cache
      queryClient.setQueryData(['drafts', variables.draftId], data);
      
      // Update latest draft cache
      queryClient.setQueryData(['drafts', 'latest'], { draft: data });
    },
  });
};

/**
 * Delete draft mutation
 */
export const useDeleteDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId) => {
      const response = await apiClient.delete(
        getEndpoint('drafts.delete', { id: draftId })
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete draft');
      }
      return response;
    },
    onSuccess: (_, draftId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['drafts', draftId] });
      
      // Invalidate drafts list
      queryClient.invalidateQueries({ queryKey: ['drafts', 'list'] });
      
      // Invalidate latest draft
      queryClient.invalidateQueries({ queryKey: ['drafts', 'latest'] });
    },
  });
};

