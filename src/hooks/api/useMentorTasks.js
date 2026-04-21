/**
 * useMentorTasks API Hooks
 * 
 * React Query hooks for mentor task operations.
 * Provides queries and mutations for mentor tasks data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useMentorTasks Query Hook
 * 
 * Fetches list of tasks for mentor with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (cohort_id, student_id, status, page, limit)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Mentor tasks query
 */
export const useMentorTasks = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['mentor-tasks', filters],
    queryFn: async () => {
      const response = await apiClient.get(
        getEndpoint('mentor.tasks.list'),
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
 * useCreateMentorTask Mutation Hook
 * 
 * Creates a new task assigned to a student.
 * 
 * @returns {Object} Create task mutation
 */
export const useCreateMentorTask = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (taskData) => {
      const response = await apiClient.post(
        getEndpoint('mentor.tasks.create'),
        taskData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create task');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate mentor tasks queries
      queryClient.invalidateQueries({ queryKey: ['mentor-tasks'] });
      // Invalidate student tasks queries (for the assigned student)
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      
      createAlert('success', 'Task created successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to create task');
    },
  });
};

/**
 * useUpdateMentorTask Mutation Hook
 * 
 * Updates an existing task.
 * 
 * @returns {Object} Update task mutation
 */
export const useUpdateMentorTask = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ taskId, ...updateData }) => {
      const response = await apiClient.put(
        buildEndpoint(getEndpoint('mentor.tasks.update'), { id: taskId }),
        updateData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update task');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate task queries
      queryClient.invalidateQueries({ queryKey: ['mentor-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      
      createAlert('success', 'Task updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update task');
    },
  });
};

/**
 * useDeleteMentorTask Mutation Hook
 * 
 * Deletes a task.
 * 
 * @returns {Object} Delete task mutation
 */
export const useDeleteMentorTask = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (taskId) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('mentor.tasks.delete'), { id: taskId })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate task queries
      queryClient.invalidateQueries({ queryKey: ['mentor-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables] });
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      
      createAlert('success', 'Task deleted successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to delete task');
    },
  });
};
