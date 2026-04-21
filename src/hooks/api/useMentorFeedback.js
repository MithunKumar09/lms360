/**
 * useMentorFeedback API Hooks
 * 
 * React Query hooks for mentor feedback operations.
 * Provides mutations for submitting feedback and queries for fetching feedback.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert.js';

/**
 * useCreateMentorFeedback Mutation Hook
 * 
 * Submits feedback for a mentor (student only).
 * 
 * @returns {Object} Create feedback mutation
 */
export const useCreateMentorFeedback = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ mentorId, data }) => {
      const endpoint = buildEndpoint(getEndpoint('student.mentorFeedback'), { mentorId });
      const response = await apiClient.post(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to submit feedback');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate mentor feedback queries
      queryClient.invalidateQueries({ queryKey: ['mentor-feedback', variables.mentorId] });
      queryClient.invalidateQueries({ queryKey: ['mentor-feedback-list'] });
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      
      createAlert('success', 'Thank you! Your feedback has been submitted successfully.');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to submit feedback. Please try again.');
    },
  });
};

/**
 * useMentorFeedbackList Query Hook
 * 
 * Fetches feedback list for a mentor.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters (cohort_id, student_id, status, page, limit)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Feedback list query
 */
export const useMentorFeedbackList = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['mentor-feedback-list', filters],
    queryFn: async () => {
      const endpoint = getEndpoint('mentor.feedback');
      const response = await apiClient.get(endpoint, filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch feedback');
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
