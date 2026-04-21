/**
 * useAssignCourse API Hook
 * 
 * React Query hook for assigning a course to selected options.
 * Handles mutation, cache invalidation, and success/error notifications.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useAssignCourse Mutation Hook
 * 
 * Assigns a course to selected options.
 * 
 * @returns {Object} Assign course mutation
 */
export const useAssignCourse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const createAlert = useSweetAlert();
  const clearCache = useAssignCourseStore((state) => state.clearCache);
  const closeAssignModal = useAssignCourseStore((state) => state.closeAssignModal);

  return useMutation({
    mutationFn: async ({ courseId, assignments }) => {
      try {
        const response = await apiClient.post(`/courses/${courseId}/assign`, {
          assignments,
        });

        if (!response.success) {
          const errorMessage =
            response.error ||
            response.message ||
            'Failed to assign course. Please try again.';
          throw new Error(errorMessage);
        }

        return response;
      } catch (error) {
        // Enhance error message for better UX
        if (error.message) {
          throw error;
        }
        throw new Error(
          error.response?.data?.error ||
            error.response?.data?.message ||
            'Network error. Please check your connection and try again.'
        );
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on validation errors (4xx)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['assignableCourses'] });
      queryClient.invalidateQueries({
        queryKey: ['assignmentOptions', variables.courseId],
      });
      queryClient.invalidateQueries({ queryKey: ['assignmentReport'] });

      // Clear cache
      clearCache();

      // Close modal
      closeAssignModal();

      // Show success alert
      createAlert('success', data.message || 'Course assigned successfully');
    },
    onError: (error) => {
      // Show error alert
      createAlert('error', error.message || 'Failed to assign course');
    },
  });
};

export default useAssignCourse;

