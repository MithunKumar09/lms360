/**
 * Parent Dashboard API Hooks
 * 
 * React Query hooks for parent dashboard features.
 * Connected to parent API endpoints in Phase 2.4.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * Fetch parent dashboard statistics
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useParentDashboardStatistics(options = {}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['parentDashboardStatistics', user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/parent/dashboard/statistics');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard statistics');
      }

      return response;
    },
    enabled: options.enabled !== false && isAuthenticated && !!user && user.role === 'parent',
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
}

/**
 * Fetch list of linked children for parent
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useParentStudents(options = {}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['parentStudents', user?.id],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      const response = await apiClient.get('/parent/students');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch linked children');
      }

      return response;
    },
    enabled: options.enabled !== false && isAuthenticated && !!user && user.role === 'parent',
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
}

/**
 * Fetch student courses for a selected child
 * @param {Object} filters - Filter parameters (studentId, page, limit, status)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useParentStudentCourses(filters = {}, options = {}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { studentId, page = 1, limit = 12, status } = filters;

  return useQuery({
    queryKey: ['parentStudentCourses', user?.id, studentId, page, limit, status],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!studentId) {
        return {
          success: true,
          courses: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
        };
      }

      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (status) params.append('status', status);
      
      const response = await apiClient.get(`/parent/students/${studentId}/courses?${params.toString()}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student courses');
      }

      return response;
    },
    enabled: options.enabled !== false && isAuthenticated && !!user && user.role === 'parent' && !!studentId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    ...options,
  });
}

/**
 * Fetch student progress overview
 * @param {Object} filters - Filter parameters (studentId)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useParentStudentProgress(filters = {}, options = {}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { studentId } = filters;

  return useQuery({
    queryKey: ['parentStudentProgress', user?.id, studentId],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!studentId) {
        return { success: true, progress: null };
      }

      const response = await apiClient.get(`/parent/students/${studentId}/progress`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student progress');
      }

      return response;
    },
    enabled: options.enabled !== false && isAuthenticated && !!user && user.role === 'parent' && !!studentId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    ...options,
  });
}

/**
 * Fetch student activity and engagement data
 * @param {Object} filters - Filter parameters (studentId, timeRange)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useParentStudentActivity(filters = {}, options = {}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { studentId, timeRange = 'week' } = filters;

  return useQuery({
    queryKey: ['parentStudentActivity', user?.id, studentId, timeRange],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!studentId) {
        return { success: true, activity: {}, engagement: {} };
      }

      const response = await apiClient.get(`/parent/students/${studentId}/activity?timeRange=${timeRange}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student activity');
      }

      return response;
    },
    enabled: options.enabled !== false && isAuthenticated && !!user && user.role === 'parent' && !!studentId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    ...options,
  });
}

/**
 * Fetch student achievements and certificates
 * @param {Object} filters - Filter parameters (studentId)
 * @param {Object} options - React Query options
 * @returns {Object} React Query result
 */
export function useParentStudentAchievements(filters = {}, options = {}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { studentId } = filters;

  return useQuery({
    queryKey: ['parentStudentAchievements', user?.id, studentId],
    queryFn: async () => {
      if (!user || !isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      if (!studentId) {
        return { success: true, achievements: {} };
      }

      const response = await apiClient.get(`/parent/students/${studentId}/achievements`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch student achievements');
      }

      return response;
    },
    enabled: options.enabled !== false && isAuthenticated && !!user && user.role === 'parent' && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
}

export default {
  useParentDashboardStatistics,
  useParentStudents,
  useParentStudentCourses,
  useParentStudentProgress,
  useParentStudentActivity,
  useParentStudentAchievements,
};
