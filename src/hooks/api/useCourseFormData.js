/**
 * React Query hooks for Course Form Data
 * 
 * These hooks provide data fetching for course form dropdowns:
 * - Instructors
 * - Classes
 * - Subjects
 * - Organizations
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
 * useInstructors - Fetch instructors list with caching
 */
export const useInstructors = (params = {}, options = {}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  // For admin, filter by their orgId
  // For superadmin, use organizationId from params if provided
  const finalParams = {
    ...params,
    // Use roles if provided, otherwise default to role: 'instructor'
    ...(params.roles ? { roles: params.roles } : { role: 'instructor' }),
    ...(userRole === 'admin' && userOrgId ? { orgId: userOrgId } : {}),
    // If organizationId is provided in params, use it (for superadmin)
    ...(params.organizationId !== undefined ? { orgId: params.organizationId } : {}),
    // Pass classIds if provided (for filtering instructors by classes)
    ...(params.classIds !== undefined ? { classIds: params.classIds } : {}),
  };

  const key = buildKey('instructors', finalParams);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get('/users', sanitizeParams(finalParams));
      if (!response.success && response.error) {
        const err = new Error(response.error || 'Failed to fetch instructors');
        err.status = response.status;
        throw err;
      }
      // API returns { items, total, page, pageSize } format
      const items = response.items || response.users || [];
      const total = response.total || 0;
      const page = response.page || finalParams.page || 1;
      const pageSize = response.pageSize || finalParams.limit || 20;
      
      return {
        instructors: items,
        pagination: {
          total,
          pages: Math.ceil(total / pageSize),
          page,
          limit: pageSize,
        },
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
 * useClasses - Fetch classes list with caching
 * Can filter by instructorIds (instructors hold classes)
 */
export const useClasses = (params = {}, options = {}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  // For admin, filter by their orgId
  // For superadmin, use organizationId from params if provided
  const finalParams = {
    ...params,
    ...(userRole === 'admin' && userOrgId ? { orgId: userOrgId } : {}),
    // If organizationId is provided in params, use it (for superadmin)
    ...(params.organizationId !== undefined ? { orgId: params.organizationId } : {}),
    // If instructorIds are provided, filter by them (instructors hold classes)
    ...(params.instructorIds && params.instructorIds.length > 0 
      ? { instructorIds: params.instructorIds } 
      : {}),
  };

  const key = buildKey('classes', finalParams);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      // Assuming there's a classes API endpoint
      // If not, we'll need to create it or use an existing one
      const response = await apiClient.get('/classes', sanitizeParams(finalParams));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch classes');
        err.status = response.status;
        throw err;
      }
      return {
        classes: response.classes || response.data || [],
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
 * useSubjects - Fetch subjects list with caching
 * Dependent on classIds and can filter by instructorIds (instructors hold subjects)
 */
export const useSubjects = (params = {}, options = {}) => {
  const hasClassIds = Boolean(params?.classIds && params.classIds.length > 0);
  const isEnabled = hasClassIds && (options.enabled !== false);
  
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  // For admin, filter by their orgId
  // For superadmin, use organizationId from params if provided
  const finalParams = {
    ...params,
    ...(userRole === 'admin' && userOrgId ? { orgId: userOrgId } : {}),
    // If organizationId is provided in params, use it (for superadmin)
    ...(params.organizationId !== undefined ? { orgId: params.organizationId } : {}),
    // If instructorIds are provided, filter by them (instructors hold subjects)
    ...(params.instructorIds && params.instructorIds.length > 0 
      ? { instructorIds: params.instructorIds } 
      : {}),
  };

  const key = buildKey('subjects', finalParams);
  
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!params?.classIds || params.classIds.length === 0) {
        return {
          subjects: [],
          pagination: { total: 0, pages: 0, page: 1, limit: 20 },
        };
      }
      // Assuming there's a subjects API endpoint that accepts classIds
      const response = await apiClient.get('/subjects', sanitizeParams(finalParams));
      if (!response.success) {
        const err = new Error(response.error || 'Failed to fetch subjects');
        err.status = response.status;
        throw err;
      }
      return {
        subjects: response.subjects || response.data || [],
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
 * useOrganizations - Fetch organizations list with caching
 * Only available for superadmin
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
        pagination: response.pagination || { total: 0, pages: 0, page: 1, limit: 20 },
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
 * Invalidate course form data caches - call after mutations
 */
export const useInvalidateCourseFormData = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateInstructors: () => queryClient.invalidateQueries({ queryKey: ['instructors'] }),
    invalidateClasses: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
    invalidateSubjects: (classIds) => queryClient.invalidateQueries({ 
      queryKey: ['subjects', { classIds }] 
    }),
    invalidateOrganizations: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  };
};

