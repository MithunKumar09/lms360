/**
 * Student Dashboard Statistics Hook
 * 
 * React Query hook for fetching student dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

/**
 * Fetch dashboard statistics for authenticated student
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useStudentDashboardStats(options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole);

  return useQuery({
    queryKey: ['studentDashboardStats'],
    queryFn: async () => {
      const response = await apiClient.get('/students/dashboard-stats');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard statistics');
      }

      return response.data;
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 30000, // 30 seconds
    retry: 1,
    ...options,
  });
}
