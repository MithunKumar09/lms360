/**
 * useReminders API Hooks
 * 
 * React Query hooks for fetching, creating, and deleting quiz reminders.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useReminders Query Hook
 * 
 * Fetches reminders for the current user or specified student.
 * 
 * @param {Object} options - Query options
 * @param {string} options.studentId - Student ID (optional, defaults to current user)
 * @param {string} options.quizId - Filter by quiz ID (optional)
 * @param {boolean} options.isSent - Filter by sent status (optional)
 * @param {number} options.page - Page number (optional)
 * @param {number} options.limit - Items per page (optional)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Reminders query
 */
export const useReminders = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useQuery({
    queryKey: ['quiz-reminders', options.studentId || user?.id, options.quizId, options.isSent, options.page, options.limit],
    queryFn: async () => {
      const params = {};
      if (options.studentId) params.studentId = options.studentId;
      if (options.quizId) params.quizId = options.quizId;
      if (options.isSent !== undefined) params.isSent = options.isSent.toString();
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const response = await apiClient.get('/quiz-reminders', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch reminders');
      }

      return response;
    },
    enabled: isAuthenticated && (userRole === 'student' || userRole === 'admin' || userRole === 'instructor' || userRole === 'superadmin') && (options.enabled !== false),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

/**
 * useCreateReminder Mutation Hook
 * 
 * Creates a new quiz reminder.
 * 
 * @returns {Object} Create reminder mutation
 */
export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ quizId, reminderType, reminderTime }) => {
      const response = await apiClient.post('/quiz-reminders', {
        quizId,
        reminderType,
        reminderTime,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create reminder');
      }

      return response;
    },
    onSuccess: (data) => {
      // Invalidate reminders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['quiz-reminders'] });
      createAlert({
        icon: 'success',
        title: 'Reminder Set!',
        text: 'Your reminder has been successfully created.',
      });
    },
    onError: (error) => {
      console.error('Error creating reminder:', error);
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create reminder. Please try again.',
      });
    },
  });
};

/**
 * useDeleteReminder Mutation Hook
 * 
 * Deletes a quiz reminder.
 * 
 * @returns {Object} Delete reminder mutation
 */
export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (reminderId) => {
      const response = await apiClient.delete(`/quiz-reminders/${reminderId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete reminder');
      }

      return response;
    },
    onSuccess: () => {
      // Invalidate reminders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['quiz-reminders'] });
      createAlert({
        icon: 'success',
        title: 'Reminder Deleted',
        text: 'The reminder has been successfully deleted.',
      });
    },
    onError: (error) => {
      console.error('Error deleting reminder:', error);
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to delete reminder. Please try again.',
      });
    },
  });
};

export default useReminders;

