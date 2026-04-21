/**
 * useRolePromotionHistory API Hooks
 * 
 * React Query hooks for role promotion history operations.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useRolePromotionHistory Query Hook
 * 
 * Fetches role promotion history (Admin only).
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.user_id - Filter by user ID
 * @param {string} params.request_id - Filter by request ID
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.start_date - Start date filter
 * @param {string} params.end_date - End date filter
 * @param {Object} options - Query options
 * @returns {Object} History query
 */
export const useRolePromotionHistory = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (params.user_id) queryParams.append('user_id', params.user_id);
  if (params.request_id) queryParams.append('request_id', params.request_id);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);

  return useQuery({
    queryKey: ['role-promotion-history', params],
    queryFn: async () => {
      const response = await apiClient.get(
        `/role-promotion-history?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch promotion history');
      }

      return response.data;
    },
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

