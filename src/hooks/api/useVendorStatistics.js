/**
 * Vendor Statistics API Hooks
 * 
 * React Query hooks for vendor dashboard statistics.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useVendorDashboardStatistics Query Hook
 * 
 * Fetches comprehensive vendor dashboard statistics
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Statistics query
 */
export const useVendorDashboardStatistics = (options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorDashboardStatistics', user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/vendor/dashboard/statistics');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard statistics');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * useVendorMonthlyTrends Query Hook
 * 
 * Fetches vendor monthly trends for line chart
 * 
 * @param {Object} options - Query options
 * @param {string} options.metric - Metric type: 'enrollments', 'registrations', or 'revenue'
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Monthly trends query
 */
export const useVendorMonthlyTrends = (options = {}) => {
  const { metric = 'enrollments', enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorMonthlyTrends', user?.id, metric],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get(
        `/vendor/dashboard/analytics?type=trends&metric=${metric}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch monthly trends');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * useVendorDistribution Query Hook
 * 
 * Fetches vendor distribution data for pie chart
 * 
 * @param {Object} options - Query options
 * @param {string} options.distributionType - Distribution type: 'enrollment_status', 'revenue_sources', or 'course_distribution'
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Distribution query
 */
export const useVendorDistribution = (options = {}) => {
  const { distributionType = 'enrollment_status', enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['vendorDistribution', user?.id, distributionType],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get(
        `/vendor/dashboard/analytics?type=distribution&distributionType=${distributionType}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch distribution data');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'vendor',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
};

export default {
  useVendorDashboardStatistics,
  useVendorMonthlyTrends,
  useVendorDistribution,
};
