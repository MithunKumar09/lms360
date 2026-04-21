/**
 * Vendor Events API Hooks
 * 
 * React Query hooks for vendor event operations.
 * Provides queries for vendor's event registrations and statistics.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useVendorEventRegistrations Query Hook
 * 
 * Fetches registered students for a specific event
 * 
 * @param {string} eventId - Event ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.status - Filter by registration status
 * @param {string} options.paymentStatus - Filter by payment status
 * @param {string} options.search - Search in student name/email
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Registrations query
 */
export const useVendorEventRegistrations = (eventId, options = {}) => {
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
      'vendorEventRegistrations',
      eventId,
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

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) queryParams.append('status', status);
      if (paymentStatus) queryParams.append('paymentStatus', paymentStatus);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get(
        `/vendor/events/${eventId}/registrations?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event registrations');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!eventId,
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
 * useVendorEventStatistics Query Hook
 * 
 * Fetches statistics for a specific event
 * 
 * @param {string} eventId - Event ID
 * @param {Object} options - Query options
 * @returns {Object} Statistics query
 */
export const useVendorEventStatistics = (eventId, options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorEventStatistics', eventId, user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      const response = await apiClient.get(`/vendor/events/${eventId}/statistics`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event statistics');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor' && !!eventId,
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
 * useVendorAllEventRegistrations Query Hook
 * 
 * Fetches all event registrations across vendor's events
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.eventId - Filter by specific event
 * @param {string} options.status - Filter by registration status
 * @param {string} options.search - Search in student name/email or event title
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Registrations query
 */
export const useVendorAllEventRegistrations = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    eventId = null,
    status = null,
    search = null,
    enabled = true,
  } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: [
      'vendorAllEventRegistrations',
      user?.id,
      page,
      limit,
      eventId,
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

      if (eventId) queryParams.append('eventId', eventId);
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const response = await apiClient.get(
        `/vendor/events/registrations?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event registrations');
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
  useVendorEventRegistrations,
  useVendorEventStatistics,
  useVendorAllEventRegistrations,
};
