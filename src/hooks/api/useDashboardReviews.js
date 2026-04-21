/**
 * useDashboardReviews API Hook
 * 
 * React Query hook for fetching reviews for dashboard based on user role.
 * 
 * Role-based logic:
 * - Superadmin: Reviews for courses they created (global courses)
 * - Admin: Reviews for all courses in their org (excluding global courses)
 * - Instructor: Reviews for courses they created
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useDashboardReviews Query Hook
 * 
 * Fetches reviews for dashboard based on user role
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Reviews per page (default: 50)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Reviews query
 */
export const useDashboardReviews = (options = {}) => {
  const { page = 1, limit = 50, enabled = true } = options;
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['dashboardReviews', user?.role, user?.id, user?.orgId, page, limit],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const endpoint = getEndpoint('reviews.dashboard');
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await apiClient.get(`${endpoint}?${queryParams.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard reviews');
      }

      return response;
    },
    enabled: enabled && isAuthenticated && !!user,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 403 (permission denied) or 404
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export default useDashboardReviews;
