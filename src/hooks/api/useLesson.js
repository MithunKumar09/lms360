/**
 * useLesson API Hook
 * 
 * React Query hook for fetching lesson data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * useLesson Query Hook
 * 
 * Fetches lesson details by courseId and lessonId
 * 
 * @param {string} courseId - Course ID
 * @param {string} lessonId - Lesson ID
 * @param {boolean} enabled - Whether query is enabled
 * @returns {Object} Lesson query
 */
export const useLesson = (courseId, lessonId, options = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['lesson', courseId, lessonId],
    queryFn: async () => {
      if (!courseId || !lessonId) {
        throw new Error('Course ID and Lesson ID are required');
      }
      const url = `/courses/${courseId}/lessons/${lessonId}`;
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch lesson');
      }
      return response;
    },
    enabled: enabled && !!courseId && !!lessonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useUpdateWatchProgress Mutation Hook
 * 
 * Updates watch progress for a lesson
 * Includes milestone detection on lesson completion
 * 
 * @returns {Object} Update watch progress mutation
 */
export const useUpdateWatchProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, lessonId, watchDuration, totalDuration, completed }) => {
      if (!courseId || !lessonId) {
        throw new Error('Course ID and Lesson ID are required');
      }
      if (watchDuration === undefined || totalDuration === undefined) {
        throw new Error('watchDuration and totalDuration are required');
      }

      const url = `/courses/${courseId}/lessons/${lessonId}/watch`;
      const response = await apiClient.post(url, {
        watchDuration,
        totalDuration,
        completed: completed || false
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update watch progress');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate lesson query to refresh watch progress
      queryClient.invalidateQueries({ 
        queryKey: ['lesson', variables.courseId, variables.lessonId] 
      });

      // If lesson is completed and milestone was detected, invalidate roadmap
      if (variables.completed && data.milestoneCompleted) {
        queryClient.invalidateQueries({ 
          queryKey: ['roadmap'] 
        });
      }
    }
  });
};

