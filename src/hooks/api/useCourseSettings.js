/**
 * React Query hooks for Course Settings Data
 * 
 * These hooks provide cache-first, stale-while-revalidate fetching for course settings dropdown data.
 * Includes categories, subcategories, course types, program types, course levels, and skills.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

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
 * useCategories - Fetch categories list with caching
 */
export const useCategories = (params = {}, options = {}) => {
  const key = buildKey('courseCategories', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/course-settings/categories', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch categories');
        err.status = response.status;
        throw err;
      }
      return {
        categories: response.data || [],
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useSubcategories - Fetch subcategories list with caching
 * Dependent on categoryId
 */
export const useSubcategories = (params = {}, options = {}) => {
  const hasCategoryId = Boolean(params?.categoryId);
  const isEnabled = hasCategoryId && (options.enabled !== false);
  
  const key = buildKey('courseSubcategories', params);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!params?.categoryId) {
        return {
          subcategories: [],
          pagination: { total: 0, pages: 0, page: 1, limit: 20 },
        };
      }
      const response = await apiClient.get('/course-settings/subcategories', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch subcategories');
        err.status = response.status;
        throw err;
      }
      return {
        subcategories: response.data || [],
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
      };
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });
};

/**
 * useCourseTypes - Fetch course types list with caching
 */
export const useCourseTypes = (params = {}, options = {}) => {
  const key = buildKey('courseTypes', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/course-settings/types', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch course types');
        err.status = response.status;
        throw err;
      }
      return {
        types: response.data || [],
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes - types change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useProgramTypes - Fetch program types list with caching
 */
export const useProgramTypes = (params = {}, options = {}) => {
  const key = buildKey('programTypes', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/course-settings/program-types', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch program types');
        err.status = response.status;
        throw err;
      }
      return {
        programTypes: response.data || [],
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes - program types change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useCourseLevels - Fetch course levels list with caching
 */
export const useCourseLevels = (params = {}, options = {}) => {
  const key = buildKey('courseLevels', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/course-settings/levels', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch course levels');
        err.status = response.status;
        throw err;
      }
      return {
        levels: response.data || [],
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes - levels change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useCourseSkills - Fetch course skills list with caching
 */
export const useCourseSkills = (params = {}, options = {}) => {
  const key = buildKey('courseSkills', params);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/course-settings/skills', sanitizeParams(params));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch course skills');
        err.status = response.status;
        throw err;
      }
      return {
        skills: response.data || [],
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * Invalidate course settings caches - call after mutations
 */
export const useInvalidateCourseSettings = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateCategories: () => queryClient.invalidateQueries({ queryKey: ['courseCategories'] }),
    invalidateSubcategories: (categoryId) => queryClient.invalidateQueries({ 
      queryKey: ['courseSubcategories', { categoryId }] 
    }),
    invalidateCourseTypes: () => queryClient.invalidateQueries({ queryKey: ['courseTypes'] }),
    invalidateProgramTypes: () => queryClient.invalidateQueries({ queryKey: ['programTypes'] }),
    invalidateCourseLevels: () => queryClient.invalidateQueries({ queryKey: ['courseLevels'] }),
    invalidateCourseSkills: () => queryClient.invalidateQueries({ queryKey: ['courseSkills'] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
      queryClient.invalidateQueries({ queryKey: ['courseSubcategories'] });
      queryClient.invalidateQueries({ queryKey: ['courseTypes'] });
      queryClient.invalidateQueries({ queryKey: ['programTypes'] });
      queryClient.invalidateQueries({ queryKey: ['courseLevels'] });
      queryClient.invalidateQueries({ queryKey: ['courseSkills'] });
    },
  };
};

