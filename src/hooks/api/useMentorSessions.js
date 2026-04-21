/**
 * useMentorSessions API Hooks
 * 
 * React Query hooks for mentor session operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert.js';

/**
 * useMentorSessions Query Hook
 */
export const useMentorSessions = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['mentor-sessions', filters],
    queryFn: async () => {
      const endpoint = getEndpoint('mentor.sessions.list');
      const response = await apiClient.get(endpoint, filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sessions');
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
 * useCreateMentorSession Mutation Hook
 */
export const useCreateMentorSession = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (data) => {
      const endpoint = getEndpoint('mentor.sessions.create');
      const response = await apiClient.post(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create session');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Session created successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to create session');
    },
  });
};

/**
 * useUpdateMentorSession Mutation Hook
 */
export const useUpdateMentorSession = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ sessionId, data }) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.sessions.update'), { id: sessionId });
      const response = await apiClient.put(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update session');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Session updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update session');
    },
  });
};

/**
 * useDeleteMentorSession Mutation Hook
 */
export const useDeleteMentorSession = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (sessionId) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.sessions.delete'), { id: sessionId });
      const response = await apiClient.delete(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete session');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Session deleted successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete session');
    },
  });
};
