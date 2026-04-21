/**
 * useInstructorDashboard API Hook
 * 
 * React Query hook for fetching instructor dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useInstructorDashboard Query Hook
 * 
 * Fetches all dashboard data for an instructor:
 * - Course statistics (total, active, enrolled, completed)
 * - Student count
 * - Review/feedback statistics
 * - Recent feedbacks
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Dashboard query
 */
export const useInstructorDashboard = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['instructorDashboard', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/instructors/dashboard');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch instructor dashboard');
      }
      return response.dashboard;
    },
    enabled: enabled && isAuthenticated && (user?.role === 'instructor' || user?.role === 'orginstructor'),
    staleTime: 1 * 60 * 1000, // 1 minute (dashboard data changes frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...options,
  });
};

export default useInstructorDashboard;
