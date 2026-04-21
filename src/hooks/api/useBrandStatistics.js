/**
 * Brand Statistics API Hooks
 * 
 * React Query hooks for brand dashboard statistics.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useBrandDashboardStatistics Query Hook
 * 
 * Fetches comprehensive brand dashboard statistics
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Statistics query
 */
export const useBrandDashboardStatistics = (options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['brandDashboardStatistics', user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/brand/dashboard/statistics');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard statistics');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'brand',
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
 * useBrandMonthlyTrends Query Hook
 * 
 * Fetches brand monthly trends for line chart
 * 
 * @param {Object} options - Query options
 * @param {string} options.metric - Metric type: 'events', 'registrations', or 'certificates'
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Monthly trends query
 */
export const useBrandMonthlyTrends = (options = {}) => {
  const { metric = 'events', enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['brandMonthlyTrends', user?.id, metric],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get(
        `/brand/dashboard/analytics?type=trends&metric=${metric}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch monthly trends');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'brand',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * useBrandDistribution Query Hook
 * 
 * Fetches brand distribution data for pie chart
 * 
 * @param {Object} options - Query options
 * @param {string} options.distributionType - Distribution type: 'event_status', 'certificate_status', or 'event_types'
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Distribution query
 */
export const useBrandDistribution = (options = {}) => {
  const { distributionType = 'event_status', enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['brandDistribution', user?.id, distributionType],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get(
        `/brand/dashboard/analytics?type=distribution&distributionType=${distributionType}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch distribution data');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user && user.role === 'brand',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
};

export default {
  useBrandDashboardStatistics,
  useBrandMonthlyTrends,
  useBrandDistribution,
};
