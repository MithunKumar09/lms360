/**
 * useMentorMaterials API Hooks
 * 
 * React Query hooks for mentor materials operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
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
 * useMentorMaterials Query Hook
 */
export const useMentorMaterials = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['mentor-materials', filters],
    queryFn: async () => {
      const endpoint = getEndpoint('mentor.materials.list');
      const response = await apiClient.get(endpoint, filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch materials');
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
 * useCreateMentorMaterial Mutation Hook
 */
export const useCreateMentorMaterial = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ data, file }) => {
      const endpoint = getEndpoint('mentor.materials.create');
      
      if (file) {
        // Upload with file
        const formData = new FormData();
        formData.append('file', file);
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            formData.append(key, data[key]);
          }
        });

        const token = await getAuthToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}${endpoint}`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: formData,
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to create material');
        }
        return result.data;
      } else {
        // Create with external URL
        const response = await apiClient.post(endpoint, data);
        if (!response.success) {
          throw new Error(response.error || 'Failed to create material');
        }
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-materials'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Material created successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to create material');
    },
  });
};

/**
 * useUpdateMentorMaterial Mutation Hook
 */
export const useUpdateMentorMaterial = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ materialId, data }) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.materials.update'), { id: materialId });
      const response = await apiClient.put(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update material');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-materials'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Material updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update material');
    },
  });
};

/**
 * useDeleteMentorMaterial Mutation Hook
 */
export const useDeleteMentorMaterial = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (materialId) => {
      const endpoint = buildEndpoint(getEndpoint('mentor.materials.delete'), { id: materialId });
      const response = await apiClient.delete(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete material');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-materials'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      createAlert('success', 'Material deleted successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete material');
    },
  });
};
