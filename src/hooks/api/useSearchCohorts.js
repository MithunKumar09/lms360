/**
 * useSearchCohorts - React Query hook for searching cohorts
 * 
 * Provides cache-first, stale-while-revalidate fetching for cohort search.
 * Prevents redundant API calls and improves performance.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * Build a stable query key from params
 */
const buildKey = (params) => {
  const normalized = Object.entries(params || {}).reduce((acc, [k, v]) => {
    if (v === undefined || v === null || v === '') return acc;
    if (Array.isArray(v)) {
      acc[k] = [...v].sort();
    } else {
      acc[k] = v;
    }
    return acc;
  }, {});
  return ['searchCohorts', normalized];
};

/**
 * Sanitize params - remove undefined/null/empty values
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
 * useSearchCohorts - Fetch cohorts for search/dropdown with caching
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.q - Search query
 * @param {string} params.orgId - Organization ID (required for admin/instructor)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.pageSize - Page size (default: 100)
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Query result with items, total, etc.
 */
export const useSearchCohorts = (params = {}, options = {}) => {
  const key = buildKey(params);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/search/cohorts', sanitizeParams(params));
      
      // Handle both response formats
      if (response.items) {
        return {
          items: response.items || [],
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 100,
        };
      }
      
      // Fallback for other response formats
      return {
        items: response.classes || response.data || [],
        total: response.total || 0,
        page: response.page || 1,
        pageSize: response.pageSize || 100,
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes - cohorts don't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchOnMount: false, // Only refetch if data is stale
    refetchInterval: false, // Never refetch on interval
    retry: 1, // Retry once on failure
    // Prevent duplicate requests
    networkMode: 'online',
  });
};

