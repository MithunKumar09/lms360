/**
 * React Query hooks for Dropdown Data
 * 
 * These hooks provide cache-first, stale-while-revalidate fetching for all dropdown data.
 * Prevents redundant DB reads and improves performance significantly.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * Build a stable query key from an identifier and params.
 */
const buildKey = (name, params) => {
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
 * useOrganizations - Fetch organizations list with caching
 * Only available for superadmin users
 */
export const useOrganizations = (params = {}, options = {}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isSuperadmin = userRole === 'superadmin';
  
  const key = buildKey('organizations', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/organizations', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch organizations');
        err.status = response.status;
        throw err;
      }
      return {
        organizations: response.organizations || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: isSuperadmin && (options.enabled ?? true),
    staleTime: 10 * 60 * 1000, // 10 minutes - organizations change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useTerms - Fetch terms list with caching
 */
export const useTerms = (params = {}, options = {}) => {
  // Strict check: query is only enabled if orgId is present AND options.enabled is not false
  const hasOrgId = Boolean(params?.orgId);
  const isEnabled = hasOrgId && (options.enabled !== false);
  
  // Only build key if enabled (prevents unnecessary query key generation)
  const key = buildKey('terms', params);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      // Final safety check - should never reach here if enabled is false
      if (!params?.orgId) {
        return {
          terms: [],
          pagination: { total: 0, pages: 0 },
        };
      }
      const response = await apiClient.get('/terms', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch terms');
        err.status = response.status;
        throw err;
      }
      return {
        terms: response.terms || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Disable to prevent unnecessary refetches
    refetchOnMount: false, // Only refetch if data is stale
    retry: false, // Don't retry failed requests
  });
};

/**
 * useSections - Fetch sections list with caching
 */
export const useSections = (params = {}, options = {}) => {
  // Strict check: query is only enabled if orgId is present AND options.enabled is not false
  const hasOrgId = Boolean(params?.orgId);
  const isEnabled = hasOrgId && (options.enabled !== false);
  
  const key = buildKey('sections', params);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      // Final safety check - should never reach here if enabled is false
      if (!params?.orgId) {
        return {
          sections: [],
          pagination: { total: 0, pages: 0 },
        };
      }
      const response = await apiClient.get('/sections', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch sections');
        err.status = response.status;
        throw err;
      }
      return {
        sections: response.sections || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Disable to prevent unnecessary refetches
    refetchOnMount: false, // Only refetch if data is stale
    retry: false, // Don't retry failed requests
  });
};

/**
 * useAcademicSessions - Fetch academic sessions list with caching
 */
export const useAcademicSessions = (params = {}, options = {}) => {
  // Strict check: query is only enabled if orgId is present AND options.enabled is not false
  const hasOrgId = Boolean(params?.orgId);
  const isEnabled = hasOrgId && (options.enabled !== false);
  
  const key = buildKey('academicSessions', params);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      // Final safety check - should never reach here if enabled is false
      if (!params?.orgId) {
        return {
          sessions: [],
          pagination: { total: 0, pages: 0 },
        };
      }
      const response = await apiClient.get('/academic-sessions', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch sessions');
        err.status = response.status;
        throw err;
      }
      return {
        sessions: response.sessions || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Disable to prevent unnecessary refetches
    refetchOnMount: false, // Only refetch if data is stale
    retry: false, // Don't retry failed requests
  });
};

/**
 * useProgramNodes - Fetch program nodes list with caching
 */
export const useProgramNodes = (params = {}, options = {}) => {
  const key = buildKey('programNodes', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/program-nodes', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch program nodes');
        err.status = response.status;
        throw err;
      }
      return {
        nodes: response.nodes || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: Boolean(params?.orgId) && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useElectiveGroups - Fetch elective groups list with caching
 */
export const useElectiveGroups = (params = {}, options = {}) => {
  const key = buildKey('electiveGroups', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/elective-groups', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch elective groups');
        err.status = response.status;
        throw err;
      }
      return {
        groups: response.groups || [],
        pagination: response.pagination || { total: 0, pages: 0 },
      };
    },
    enabled: Boolean(params?.orgId) && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useSubjectCatalogForDropdown - Fetch subjects for dropdown with caching
 */
export const useSubjectCatalogForDropdown = (params = {}, options = {}) => {
  const key = buildKey('subjectCatalogDropdown', params);
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
    enabled: Boolean(params?.orgId) && Boolean(params?.level) && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * Invalidate dropdown caches - call after mutations
 */
export const useInvalidateDropdowns = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateOrganizations: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
    invalidateTerms: (orgId) => queryClient.invalidateQueries({ queryKey: ['terms', { orgId }] }),
    invalidateSections: (orgId) => queryClient.invalidateQueries({ queryKey: ['sections', { orgId }] }),
    invalidateSessions: (orgId) => queryClient.invalidateQueries({ queryKey: ['academicSessions', { orgId }] }),
    invalidateProgramNodes: (orgId) => queryClient.invalidateQueries({ queryKey: ['programNodes', { orgId }] }),
    invalidateElectiveGroups: (orgId) => queryClient.invalidateQueries({ queryKey: ['electiveGroups', { orgId }] }),
    invalidateSubjectCatalog: (orgId) => queryClient.invalidateQueries({ queryKey: ['subjectCatalogDropdown', { orgId }] }),
    invalidateAll: (orgId) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['terms'] });
        queryClient.invalidateQueries({ queryKey: ['sections'] });
        queryClient.invalidateQueries({ queryKey: ['academicSessions'] });
        queryClient.invalidateQueries({ queryKey: ['programNodes'] });
        queryClient.invalidateQueries({ queryKey: ['electiveGroups'] });
        queryClient.invalidateQueries({ queryKey: ['subjectCatalogDropdown'] });
      }
    },
  };
};


