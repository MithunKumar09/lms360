/**
 * useAnnouncements API Hooks
 * 
 * React Query hooks for announcements operations.
 * Provides queries and mutations for announcements data with proper caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useAnnouncements Query Hook
 * 
 * Fetches list of announcements with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (page, limit, q, visibility, status, etc.)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Announcements query
 */
export const useAnnouncements = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['announcements', 'list', filters],
    queryFn: async ({ queryKey }) => {
      console.log('🔵 [CLIENT] [useAnnouncements] ===== FETCH STARTED =====');
      console.log('🔵 [CLIENT] [useAnnouncements] Query key:', queryKey);
      console.log('🔵 [CLIENT] [useAnnouncements] Filters:', filters);
      
      // Get ETag from query cache if available
      let etag = null;
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData?.etag) {
        etag = cachedData.etag;
        console.log('🔵 [CLIENT] [useAnnouncements] Using cached ETag:', etag);
      }

      const endpoint = getEndpoint('announcements.list');
      console.log('🔵 [CLIENT] [useAnnouncements] Endpoint:', endpoint);
      
      const response = await apiClient.get(
        endpoint,
        filters,
        etag
      );

      console.log('🔵 [CLIENT] [useAnnouncements] Response:', {
        success: response.success,
        notModified: response.notModified,
        count: response.announcements?.length || 0,
        total: response.pagination?.total || 0,
        error: response.error,
      });

      if (response.notModified) {
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData) {
          console.log('🔵 [CLIENT] [useAnnouncements] Using cached data (not modified)');
          return cachedData;
        }
      }

      if (!response.success) {
        console.error('🔴 [CLIENT] [useAnnouncements] Request failed:', response.error);
        throw new Error(response.error || 'Failed to fetch announcements');
      }

      console.log('🟢 [CLIENT] [useAnnouncements] ===== FETCH SUCCESSFUL =====');
      return {
        announcements: response.announcements || [],
        pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
        etag: response.etag,
      };
    },
    enabled: isAuthenticated && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - announcements may change more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });
};

/**
 * useAnnouncement Query Hook
 * 
 * Fetches a single announcement by ID.
 * 
 * @param {string} id - Announcement ID
 * @param {Object} options - Query options
 * @returns {Object} Announcement query
 */
export const useAnnouncement = (id, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['announcements', 'detail', id],
    queryFn: async ({ queryKey, meta }) => {
      if (!id) return null;

      const previousData = meta?.previousData;
      const etag = previousData?.etag || null;

      const response = await apiClient.get(
        buildEndpoint(getEndpoint('announcements.get'), { id }),
        {},
        etag
      );

      if (response.notModified && previousData) {
        return previousData;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch announcement');
      }

      return {
        announcement: response.announcement || null,
        etag: response.etag,
      };
    },
    enabled: isAuthenticated && enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * useCreateAnnouncement Mutation Hook
 * 
 * Creates a new announcement.
 * 
 * @returns {Object} Create announcement mutation
 */
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (announcementData) => {
      const response = await apiClient.post(
        getEndpoint('announcements.create'),
        announcementData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create announcement');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'list'] });
      createAlert('success', 'Announcement created successfully');
    },
    onError: (error) => {
      console.error('Create announcement error:', error);
      createAlert('error', error.message || 'Failed to create announcement');
    },
  });
};

/**
 * useUpdateAnnouncement Mutation Hook
 * 
 * Updates an existing announcement.
 * 
 * @returns {Object} Update announcement mutation
 */
export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ id, ...announcementData }) => {
      const response = await apiClient.put(
        buildEndpoint(getEndpoint('announcements.update'), { id }),
        announcementData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update announcement');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['announcements', 'detail', variables.id] });
      createAlert('success', 'Announcement updated successfully');
    },
    onError: (error) => {
      console.error('Update announcement error:', error);
      createAlert('error', error.message || 'Failed to update announcement');
    },
  });
};

/**
 * useDeleteAnnouncement Mutation Hook
 * 
 * Deletes an announcement.
 * 
 * @returns {Object} Delete announcement mutation
 */
export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('announcements.delete'), { id })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete announcement');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'list'] });
      createAlert('success', 'Announcement deleted successfully');
    },
    onError: (error) => {
      console.error('Delete announcement error:', error);
      createAlert('error', error.message || 'Failed to delete announcement');
    },
  });
};

