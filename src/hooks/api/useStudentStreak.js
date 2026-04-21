/**
 * Student Streak Hook (Production-Grade)
 * 
 * React Query hook for fetching comprehensive student streak data.
 * Single source of truth for all streak-related metrics.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

/**
 * Fetch student's comprehensive streak data
 * 
 * Returns: {
 *   currentStreak,    // Consecutive days with activity
 *   highestStreak,    // Longest streak ever
 *   consistency,      // Percentage (0-100)
 *   lastActiveDate,   // ISO date string
 *   calendar,         // Monthly calendar with status per day
 *   source            // 'activity' | 'new_user' | 'error'
 * }
 * 
 * @param {Object} options - React Query options
 * @returns {Object} React Query result with streak data
 */
export function useStudentStreak(options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;

  // Only enable for student/alumni roles
  const allowedRoles = ['student', 'alumni'];
  const shouldFetch = isAuthenticated && allowedRoles.includes(userRole);

  return useQuery({
    queryKey: ['studentStreak'],
    queryFn: async () => {
      const response = await apiClient.get('/students/streak');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch streak data');
      }

      return {
        currentStreak: response.currentStreak || 0,
        highestStreak: response.highestStreak || 0,
        consistency: response.consistency || 0,
        lastActiveDate: response.lastActiveDate || null,
        calendar: response.calendar || [],
        source: response.source || 'unknown',
      };
    },
    enabled: shouldFetch && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes - reduced for faster updates during testing
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: 1000,
    ...options,
  });
}
