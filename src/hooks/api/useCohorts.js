/**
 * useCohorts API Hooks
 * 
 * React Query hooks for cohorts (classes) operations.
 * Provides queries and mutations for cohorts data with proper caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useCohort Query Hook
 * 
 * Fetches a single cohort by ID.
 * 
 * @param {string} id - Cohort ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Cohort query
 */
export const useCohort = (id, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['cohorts', 'detail', id],
    queryFn: async ({ queryKey }) => {
      if (!id) return null;

      // Get ETag from query cache if available
      let etag = null;
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData?.etag) {
        etag = cachedData.etag;
      }

      const response = await apiClient.get(
        buildEndpoint(getEndpoint('cohorts.get'), { id }),
        {},
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
        throw new Error(response.error || 'Failed to fetch cohort');
      }

      return {
        cohort: response.cohort || null,
        etag: response.etag,
      };
    },
    enabled: isAuthenticated && enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * useCohortExists Query Hook
 * 
 * Checks if a cohort exists with given parameters.
 * 
 * @param {Object} params - Query parameters (orgId, level, program_node_id, etc.)
 * @param {Object} options - Query options
 * @returns {Object} Cohort exists query
 */
export const useCohortExists = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['cohorts', 'exists', params],
    queryFn: async () => {
      const response = await apiClient.get(
        getEndpoint('cohorts.exists'),
        params
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to check cohort existence');
      }

      return response;
    },
    enabled: isAuthenticated && enabled && Object.keys(params).length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * useCreateCohort Mutation Hook
 * 
 * Creates a new cohort.
 * 
 * @returns {Object} Create cohort mutation
 */
export const useCreateCohort = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ data, params = {} } = {}) => {
      const cohortData = data || arguments[0]; // Support both new format and legacy
      const queryParams = params || {};
      
      const response = await apiClient.post(
        getEndpoint('cohorts.create'),
        cohortData,
        queryParams
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create cohort');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate cohorts list
      queryClient.invalidateQueries({ queryKey: ['cohorts', 'list'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Class created successfully');
      }
    },
    onError: (error) => {
      console.error('Create cohort error:', error);
      if (onError) {
        onError(error);
      } else {
        createAlert('error', error.message || 'Failed to create class');
      }
    },
  });
};

/**
 * useUpdateCohort Mutation Hook
 * 
 * Updates an existing cohort.
 * 
 * @returns {Object} Update cohort mutation
 */
export const useUpdateCohort = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ id, data, params = {}, ...legacyData } = {}) => {
      // Support both new format { id, data, params } and legacy { id, ...cohortData }
      const cohortData = data || legacyData;
      const queryParams = params || {};
      
      const response = await apiClient.put(
        buildEndpoint(getEndpoint('cohorts.update'), { id }),
        cohortData,
        queryParams
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update cohort');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: ['cohorts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['cohorts', 'detail', variables.id] });
      if (onSuccess) {
        onSuccess(data, variables);
      } else {
        createAlert('success', 'Class updated successfully');
      }
    },
    onError: (error) => {
      console.error('Update cohort error:', error);
      if (onError) {
        onError(error);
      } else {
        createAlert('error', error.message || 'Failed to update class');
      }
    },
  });
};

/**
 * useDeleteCohort Mutation Hook
 * 
 * Deletes a cohort.
 * 
 * @returns {Object} Delete cohort mutation
 */
export const useDeleteCohort = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('cohorts.delete'), { id })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete cohort');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts', 'list'] });
      createAlert('success', 'Class deleted successfully');
    },
    onError: (error) => {
      console.error('Delete cohort error:', error);
      createAlert('error', error.message || 'Failed to delete class');
    },
  });
};

