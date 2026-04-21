/**
 * useOrganizations API Hooks
 * 
 * React Query hooks for organizations operations.
 * Provides queries and mutations for organizations data with proper caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useOrganizations Query Hook
 * 
 * Fetches list of organizations with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (page, limit, search, status, etc.)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Organizations query
 */
export const useOrganizations = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['organizations', 'list', filters],
    queryFn: async ({ queryKey }) => {
      // Get ETag from query cache if available
      let etag = null;
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData?.etag) {
        etag = cachedData.etag;
      }

      const response = await apiClient.get(
        getEndpoint('organizations.list'),
        filters,
        etag
      );

      // Handle 304 Not Modified - return cached data
      if (response.notModified) {
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData) {
          return cachedData;
        }
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organizations');
      }

      return {
        organizations: response.organizations || [],
        pagination: response.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
        etag: response.etag,
      };
    },
    enabled: isAuthenticated && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - organizations don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    refetchOnReconnect: true,
    retry: 2,
  });
};

/**
 * useOrganization Query Hook
 * 
 * Fetches a single organization by ID.
 * 
 * @param {string} id - Organization ID
 * @param {Object} options - Query options
 * @returns {Object} Organization query
 */
export const useOrganization = (id, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['organizations', 'detail', id],
    queryFn: async ({ queryKey, meta }) => {
      if (!id) return null;

      const previousData = meta?.previousData;
      const etag = previousData?.etag || null;

      const response = await apiClient.get(
        buildEndpoint(getEndpoint('organizations.get'), { id }),
        {},
        etag
      );

      if (response.notModified && previousData) {
        return previousData;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization');
      }

      return {
        organization: response.organization || null,
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
 * useCreateOrganization Mutation Hook
 * 
 * Creates a new organization.
 * 
 * @returns {Object} Create organization mutation
 */
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (organizationData) => {
      const response = await apiClient.post(
        getEndpoint('organizations.create'),
        organizationData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create organization');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate organizations list to refetch
      queryClient.invalidateQueries({ queryKey: ['organizations', 'list'] });
      createAlert('success', 'Organization created successfully');
    },
    onError: (error) => {
      console.error('Create organization error:', error);
      createAlert('error', error.message || 'Failed to create organization');
    },
  });
};

/**
 * useUpdateOrganization Mutation Hook
 * 
 * Updates an existing organization.
 * 
 * @returns {Object} Update organization mutation
 */
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ id, ...organizationData }) => {
      const response = await apiClient.put(
        buildEndpoint(getEndpoint('organizations.update'), { id }),
        organizationData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update organization');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: ['organizations', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', 'detail', variables.id] });
      createAlert('success', 'Organization updated successfully');
    },
    onError: (error) => {
      console.error('Update organization error:', error);
      createAlert('error', error.message || 'Failed to update organization');
    },
  });
};

/**
 * useDeleteOrganization Mutation Hook
 * 
 * Deletes an organization.
 * 
 * @returns {Object} Delete organization mutation
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('organizations.delete'), { id })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete organization');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate organizations list
      queryClient.invalidateQueries({ queryKey: ['organizations', 'list'] });
      createAlert('success', 'Organization deleted successfully');
    },
    onError: (error) => {
      console.error('Delete organization error:', error);
      createAlert('error', error.message || 'Failed to delete organization');
    },
  });
};

