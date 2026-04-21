/**
 * Superadmin Statistics API Hooks
 * 
 * React Query hooks for superadmin dashboard analytics.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useSuperadminMonthlyTrends Query Hook
 * 
 * Fetches superadmin monthly trends for line chart
 * 
 * @param {Object} options - Query options
 * @param {string} options.metric - Metric type: 'enrollments', 'courses', or 'students'
 * @param {string} options.period - Period: '12months', '6months', or '3months' (default: '12months')
 * @param {string} options.categoryId - Optional category ID filter
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Monthly trends query
 */
export const useSuperadminMonthlyTrends = (options = {}) => {
  const { metric = 'enrollments', period = '12months', categoryId = null, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['superadminMonthlyTrends', user?.id, metric, period, categoryId],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const queryParams = new URLSearchParams({
        type: 'trends',
        metric,
        period,
      });
      if (categoryId) {
        queryParams.append('categoryId', categoryId);
      }

      const response = await apiClient.get(
        `/superadmin/dashboard/analytics?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch monthly trends');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && user?.role === 'superadmin',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
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
 * useSuperadminDistribution Query Hook
 * 
 * Fetches superadmin distribution data for pie chart
 * 
 * @param {Object} options - Query options
 * @param {string} options.distributionType - Distribution type: 'course_categories', 'enrollment_status', or 'course_status'
 * @param {string} options.timePeriod - Optional time period: 'today', 'weekly', 'monthly', 'yearly'
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Distribution query
 */
export const useSuperadminDistribution = (options = {}) => {
  const { distributionType = 'course_categories', timePeriod = null, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['superadminDistribution', user?.id, distributionType, timePeriod],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const queryParams = new URLSearchParams({
        type: 'distribution',
        distributionType,
      });
      if (timePeriod) {
        queryParams.append('timePeriod', timePeriod);
      }

      const response = await apiClient.get(
        `/superadmin/dashboard/analytics?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch distribution data');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && user?.role === 'superadmin',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
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
  useSuperadminMonthlyTrends,
  useSuperadminDistribution,
};
