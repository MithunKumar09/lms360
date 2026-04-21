/**
 * React Query hooks for Classes (Cohorts) and Subjects Catalog
 *
 * These hooks provide cache-first, stale-while-revalidate fetching with
 * stable query keys so navigation is instant and redundant DB reads are avoided.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * Build a stable query key from an identifier and params.
 * Ensures equivalent params yield the same key instance.
 */
const buildKey = (name, params) => {
  // Normalize arrays by sorting, remove empty values
  const normalized = Object.entries(params || {}).reduce((acc, [k, v]) => {
    if (v === undefined || v === null || v === '') return acc;
    if (Array.isArray(v)) {
      acc[k] = [...v].sort();
    } else {
      acc[k] = v;
    }
    return acc;
  }, {});
  return [name, normalized];
};

/**
 * Remove undefined/null/empty-string and empty-array values from query params.
 * Prevents URLs like q=undefined or department_node_id=undefined which break the API.
 */
const sanitizeParams = (params) => {
  const out = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      if (value.trim() === '') return;
      out[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      out[key] = value;
      return;
    }
    out[key] = value;
  });
  return out;
};

/**
 * useCohortsList
 * Fetches cohorts/classes list with filters and pagination.
 */
export const useCohortsList = (params, options = {}) => {
  const key = buildKey('cohorts', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/cohorts', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch classes');
        err.status = response.status;
        throw err;
      }
      return {
        classes: response.cohorts || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: Boolean(params?.orgId) && (options.enabled ?? true),
    // Cache-first behavior
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useSubjectCatalogList
 * Fetches subjects catalog with filters and pagination.
 */
export const useSubjectCatalogList = (params, options = {}) => {
  const key = buildKey('subjectCatalog', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/subject-catalog', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch subjects');
        err.status = response.status;
        throw err;
      }
      return {
        subjects: response.subjects || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: Boolean(params?.orgId) && (options.enabled ?? true),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * Mutations for cohorts publish/archive with cache invalidation.
 */
export const usePublishCohort = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId, action }) => {
      const endpoint = `/cohorts/${id}/${action}`;
      const response = await apiClient.post(`${endpoint}?orgId=${orgId}`, {});
      if (!response.success) {
        const err = new Error(response.error || 'Failed to update cohort');
        err.status = response.status;
        throw err;
      }
      return response;
    },
    onSuccess: (_data, variables) => {
      // Invalidate any cohorts list for this org
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      // Also refetch cohort-related detail if present later
    },
  });
};

/**
 * Subject create/update/archive with cache invalidation.
 */
export const useUpsertSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, body, method }) => {
      const response =
        method === 'PATCH'
          ? await apiClient.patch(`/subject-catalog?orgId=${orgId}`, body)
          : await apiClient.post(`/subject-catalog?orgId=${orgId}`, body);
      if (!response.success) {
        const err = new Error(response.error || 'Failed to save subject');
        err.status = response.status;
        throw err;
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCatalog'] });
    },
  });
};


