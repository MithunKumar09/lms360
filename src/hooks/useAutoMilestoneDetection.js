/**
 * Auto Milestone Detection Hook
 * 
 * Automatically detects and awards milestones when activities complete
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMilestoneCompletion } from '@/hooks/api/useMilestoneCompletion.js';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

export function useAutoMilestoneDetection() {
  const queryClient = useQueryClient();
  const milestoneCompletion = useMilestoneCompletion();
  const user = useAuthStore((state) => state.user);

  /**
   * Check for milestone completion after lesson watch update
   */
  const checkAfterLessonWatch = useCallback(async (courseId, lessonId) => {
    if (!user?.id || !courseId || !lessonId) return;

    try {
      // Check if any milestones were completed
      const response = await apiClient.post('/students/roadmap/milestones/check', {
        courseId,
        triggerType: 'lesson',
        triggerId: lessonId,
      });

      if (response.success && response.completedMilestones && response.completedMilestones.length > 0) {
        // Award stamps for completed milestones
        for (const milestone of response.completedMilestones) {
          await milestoneCompletion.mutateAsync({
            courseId,
            milestoneNumber: milestone.number,
          });
        }
      }
    } catch (error) {
      console.error('Error checking milestones after lesson watch:', error);
    }
  }, [user?.id, milestoneCompletion]);

  /**
   * Check for milestone completion after quiz submission
   */
  const checkAfterQuizSubmission = useCallback(async (courseId, quizId, isPassed) => {
    if (!user?.id || !courseId || !quizId || !isPassed) return;

    try {
      const response = await apiClient.post('/students/roadmap/milestones/check', {
        courseId,
        triggerType: 'quiz',
        triggerId: quizId,
        isPassed,
      });

      if (response.success && response.completedMilestones && response.completedMilestones.length > 0) {
        for (const milestone of response.completedMilestones) {
          await milestoneCompletion.mutateAsync({
            courseId,
            milestoneNumber: milestone.number,
          });
        }
      }
    } catch (error) {
      console.error('Error checking milestones after quiz submission:', error);
    }
  }, [user?.id, milestoneCompletion]);

  /**
   * Check for milestone completion after assignment submission
   */
  const checkAfterAssignmentSubmission = useCallback(async (courseId, assignmentId) => {
    if (!user?.id || !courseId || !assignmentId) return;

    try {
      const response = await apiClient.post('/students/roadmap/milestones/check', {
        courseId,
        triggerType: 'assignment',
        triggerId: assignmentId,
      });

      if (response.success && response.completedMilestones && response.completedMilestones.length > 0) {
        for (const milestone of response.completedMilestones) {
          await milestoneCompletion.mutateAsync({
            courseId,
            milestoneNumber: milestone.number,
          });
        }
      }
    } catch (error) {
      console.error('Error checking milestones after assignment submission:', error);
    }
  }, [user?.id, milestoneCompletion]);

  return {
    checkAfterLessonWatch,
    checkAfterQuizSubmission,
    checkAfterAssignmentSubmission,
  };
}
