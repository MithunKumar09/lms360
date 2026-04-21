/**
 * useMentorNotes API Hooks
 * 
 * React Query hooks for mentor notes operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert.js';

/**
 * useMentorNotes Query Hook
 */
export const useMentorNotes = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['mentor-notes', filters],
    queryFn: async () => {
      const endpoint = getEndpoint('mentor.notes.list');
      const response = await apiClient.get(endpoint, filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notes');
      }

      return response.data;
    },
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

/**
 * useCreateMentorNote Mutation Hook
 */
export const useCreateMentorNote = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (data) => {
      const endpoint = getEndpoint('mentor.notes.create');
      const response = await apiClient.post(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create note');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-notes'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Note created successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to create note');
    },
  });
};

/**
 * useUpdateMentorNote Mutation Hook
 */
export const useUpdateMentorNote = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ noteId, data }) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.notes.update'), { id: noteId });
      const response = await apiClient.put(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update note');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-notes'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Note updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update note');
    },
  });
};

/**
 * useDeleteMentorNote Mutation Hook
 */
export const useDeleteMentorNote = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (noteId) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.notes.delete'), { id: noteId });
      const response = await apiClient.delete(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete note');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-notes'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Note deleted successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete note');
    },
  });
};
