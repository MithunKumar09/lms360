/**
 * useMentors API Hooks (Admin)
 * 
 * React Query hooks for admin mentor management operations.
 * Provides queries and mutations for managing mentors and student assignments.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useMentorsList Query Hook
 * 
 * Fetches mentors list in admin's organization.
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {Object} options - Query options
 * @returns {Object} Mentors query
 */
export const useMentorsList = (params = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  return useQuery({
    queryKey: ['mentors', 'admin', params],
    queryFn: async () => {
      const response = await apiClient.get(
        `/mentors?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch mentors');
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

/**
 * useAssignStudentsToMentor Mutation Hook
 * 
 * Assigns students to a mentor.
 * 
 * @param {Object} options - Mutation options
 * @returns {Object} Assign students mutation
 */
export const useAssignStudentsToMentor = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ mentorId, studentIds, cohortId }) => {
      const response = await apiClient.post(
        `/mentors/${mentorId}/assign-students`,
        {
          student_ids: studentIds,
          cohort_id: cohortId || null,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to assign students');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate mentors queries
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Students assigned successfully!');
      }
    },
    onError: (error) => {
      console.error('Assign students error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to assign students';
        createAlert('error', errorMessage);
      }
    },
  });
};

/**
 * useUnassignStudentsFromMentor Mutation Hook
 * 
 * Unassigns students from a mentor.
 * 
 * @param {Object} options - Mutation options
 * @returns {Object} Unassign students mutation
 */
export const useUnassignStudentsFromMentor = (options = {}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({ mentorId, studentIds }) => {
      const response = await apiClient.request(
        `/mentors/${mentorId}/unassign-students`,
        {
          method: 'DELETE',
          body: JSON.stringify({ student_ids: studentIds }),
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to unassign students');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate mentors queries
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
      if (onSuccess) {
        onSuccess(data);
      } else {
        createAlert('success', 'Students unassigned successfully!');
      }
    },
    onError: (error) => {
      console.error('Unassign students error:', error);
      if (onError) {
        onError(error);
      } else {
        const errorMessage = error.message || 'Failed to unassign students';
        createAlert('error', errorMessage);
      }
    },
  });
};

