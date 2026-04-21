/**
 * useVendorOrganizations API Hook
 *
 * React Query hook for vendors to fetch their assigned organizations.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useVendorOrganizations Query Hook
 *
 * Fetches organizations assigned to the current vendor.
 *
 * @param {Object} options - Query options
 * @returns {Object} Vendor organizations query
 */
export const useVendorOrganizations = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.user?.role);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['vendor-organizations'],
    queryFn: async () => {
      const response = await apiClient.get('/vendors/me');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch vendor organizations');
      }

      return response.data;
    },
    enabled: isAuthenticated && userRole === 'vendor' && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

