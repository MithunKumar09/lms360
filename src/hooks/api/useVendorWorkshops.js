/**
 * Vendor Workshops API Hooks
 * 
 * React Query hooks for vendor workshop operations.
 * Provides queries for vendor's workshop registrations and statistics.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useVendorWorkshopRegistrations Query Hook
 * 
 * Fetches registered students for a specific workshop
 * 
 * @param {string} workshopId - Workshop ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.status - Filter by registration status
 * @param {string} options.paymentStatus - Filter by payment status
 * @param {string} options.search - Search in student name/email
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Registrations query
 */
export const useVendorWorkshopRegistrations = (workshopId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    status = null,
    paymentStatus = null,
    search = null,
    enabled = true,
  } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: [
      'vendorWorkshopRegistrations',
      workshopId,
      user?.id,
      page,
      limit,
      status,
      paymentStatus,
      search,
    ],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!workshopId) {
        throw new Error('Workshop ID is required');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) queryParams.append('status', status);
      if (paymentStatus) queryParams.append('paymentStatus', paymentStatus);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get(
        `/vendor/workshops/${workshopId}/registrations?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshop registrations');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!workshopId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * useVendorWorkshopStatistics Query Hook
 * 
 * Fetches statistics for a specific workshop
 * 
 * @param {string} workshopId - Workshop ID
 * @param {Object} options - Query options
 * @returns {Object} Statistics query
 */
export const useVendorWorkshopStatistics = (workshopId, options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorWorkshopStatistics', workshopId, user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!workshopId) {
        throw new Error('Workshop ID is required');
      }

      const response = await apiClient.get(`/vendor/workshops/${workshopId}/statistics`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshop statistics');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!workshopId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * useVendorAllWorkshopRegistrations Query Hook
 * 
 * Fetches all workshop registrations across vendor's workshops
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.workshopId - Filter by specific workshop
 * @param {string} options.status - Filter by registration status
 * @param {string} options.search - Search in student name/email or workshop title
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Registrations query
 */
export const useVendorAllWorkshopRegistrations = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    workshopId = null,
    status = null,
    search = null,
    enabled = true,
  } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: [
      'vendorAllWorkshopRegistrations',
      user?.id,
      page,
      limit,
      workshopId,
      status,
      search,
    ],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (workshopId) queryParams.append('workshopId', workshopId);
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get(
        `/vendor/workshops/registrations?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshop registrations');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export default {
  useVendorWorkshopRegistrations,
  useVendorWorkshopStatistics,
  useVendorAllWorkshopRegistrations,
};
