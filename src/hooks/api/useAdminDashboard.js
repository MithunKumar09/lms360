/**
 * useAdminDashboard API Hook
 * 
 * React Query hook for fetching admin dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useAdminDashboard Query Hook
 * 
 * Fetches all dashboard statistics for an admin:
 * - Enrolled courses count
 * - Active courses count
 * - Complete courses count
 * - Total courses count
 * - Total students count
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Dashboard query
 */
export const useAdminDashboard = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['adminDashboardStatistics', user?.id, user?.orgId],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/admin/dashboard/statistics');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch admin dashboard statistics');
      }

      return response.statistics;
    },
    enabled: enabled && isAuthenticated && (user?.role === 'admin' || user?.role === 'orgadmin'),
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

export default useAdminDashboard;
