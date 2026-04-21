/**
 * useStudentTasks API Hooks
 * 
 * React Query hooks for student task operations.
 * Provides queries and mutations for student tasks data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useStudentTasks Query Hook
 * 
 * Fetches list of tasks assigned to student with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (mentor_id, status, page, limit)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Student tasks query
 */
export const useStudentTasks = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['student-tasks', filters],
    queryFn: async () => {
      const response = await apiClient.get(
        getEndpoint('student.tasks.list'),
        filters
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tasks');
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
 * useUpdateStudentTaskStatus Mutation Hook
 * 
 * Updates task status (student can only set to 'in_progress' or 'completed').
 * 
 * @returns {Object} Update task status mutation
 */
export const useUpdateStudentTaskStatus = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ taskId, status }) => {
      const response = await apiClient.put(
        buildEndpoint(getEndpoint('student.tasks.updateStatus'), { id: taskId }),
        { status }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update task status');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate task queries
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      
      createAlert('success', 'Task status updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update task status');
    },
  });
};
