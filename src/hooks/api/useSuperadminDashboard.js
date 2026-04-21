/**
 * useSuperadminDashboard API Hook
 * 
 * React Query hook for fetching superadmin dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useSuperadminDashboard Query Hook
 * 
 * Fetches all dashboard statistics for a superadmin:
 * - Enrolled courses count
 * - Active courses count
 * - Complete courses count
 * - Total courses count
 * - Total students count
 * - Total organizations count
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Dashboard query
 */
export const useSuperadminDashboard = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['superadminDashboard', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/superadmin/dashboard/statistics');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch superadmin dashboard');
      }
      
      // Return data in format similar to instructor dashboard for consistency
      return {
        courses: {
          enrolled: response.enrolledCourses || 0,
          active: response.activeCourses || 0,
          completed: response.completeCourses || 0,
          total: response.totalCourses || 0,
        },
        students: {
          total: response.totalStudents || 0,
        },
        organizations: {
          total: response.totalOrganizations || 0,
        },
      };
    },
    enabled: enabled && isAuthenticated && user?.role === 'superadmin',
    staleTime: 2 * 60 * 1000, // 2 minutes (dashboard data changes frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...options,
  });
};

export default useSuperadminDashboard;
