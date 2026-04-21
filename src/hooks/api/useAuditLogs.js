/**
 * useAuditLogs API Hooks
 * 
 * React Query hooks for audit logs operations.
 * Provides queries for fetching audit logs with filtering and pagination.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useAuditLogs Query Hook
 * 
 * Fetches list of audit logs with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (page, pageSize, eventType, userId, orgId, dateFrom, dateTo, role, search, sort)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Audit logs query
 */
export const useAuditLogs = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['auditLogs', 'list', filters],
    queryFn: async () => {
      const response = await apiClient.get(
        getEndpoint('auditLogs.list'),
        filters
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch audit logs');
      }

      return {
        items: response.data?.items || [],
        pagination: response.data?.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    },
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000, // 30 seconds (audit logs should be relatively fresh)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });
};

