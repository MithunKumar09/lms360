/**
 * Admin Finance API Hooks
 * 
 * React Query hooks for admin finance operations
 * These hooks use the organization finance APIs with the admin's orgId
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useAdminFinanceStatistics Query Hook
 * Gets finance statistics for the admin's organization
 */
export const useAdminFinanceStatistics = (options = {}) => {
  const { from, to, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const orgId = user?.orgId;

  return useQuery({
    queryKey: ['adminFinanceStatistics', orgId, from, to],
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await apiClient.get(`/organizations/${orgId}/finance/statistics`, params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch finance statistics');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useAdminFinanceBalance Query Hook
 * Gets balance information for the admin's organization
 */
export const useAdminFinanceBalance = (options = {}) => {
  const { includeHistory = false, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const orgId = user?.orgId;

  return useQuery({
    queryKey: ['adminFinanceBalance', orgId, includeHistory],
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const params = {};
      if (includeHistory) params.includeHistory = 'true';

      const response = await apiClient.get(`/organizations/${orgId}/finance/balance`, params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch finance balance');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
