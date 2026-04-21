//src/hooks/api/useMilestoneCompletion.js
/**
 * Milestone Completion API Hook (Enhanced)
 * 
 * React Query mutation hook for completing milestones and awarding stamps
 * Includes automatic detection and celebration triggers
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * Complete a milestone and award stamp
 * 
 * @returns {Object} Mutation object with mutate function
 */
export function useMilestoneCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, milestoneNumber }) => {
      if (!courseId) {
        throw new Error('Course ID is required');
      }
      if (!milestoneNumber || milestoneNumber < 1) {
        throw new Error('Valid milestone number is required');
      }

      const response = await apiClient.post('/students/roadmap/milestones/complete', {
        courseId,
        milestoneNumber,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to complete milestone');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate roadmap query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      
      // Optionally invalidate specific course data
      queryClient.invalidateQueries({ 
        queryKey: ['roadmap', variables.courseId] 
      });
      
      // Note: Celebration trigger is handled in the component that uses this hook
      // This keeps the hook focused on data mutation
    },
    onError: (error) => {
      console.error('Milestone completion error:', error);
      // Error handling is done in component
    },
  });
}
