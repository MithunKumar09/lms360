/**
 * Milestone Detection Service
 * 
 * Detects when milestones are completed and triggers stamp awarding
 */

import { 
  checkMilestoneCompletion, 
  awardMilestoneStamp,
  getCourseMilestones
} from './roadmapMilestones.js';
import { query } from '@/lib/db/index.js';

/**
 * Check if lesson belongs to a module
 * @param {string} lessonId - Lesson UUID
 * @param {string} moduleId - Module UUID
 * @returns {Promise<boolean>} True if lesson belongs to module
 */
async function checkLessonInModule(lessonId, moduleId) {
  try {
    const result = await query(
      `SELECT 1
       FROM course_lessons cl
       JOIN course_chapters cc ON cl.chapter_id = cc.id
       WHERE cl.id = $1 AND cc.module_id = $2
       LIMIT 1`,
      [lessonId, moduleId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking lesson in module:', error);
    return false;
  }
}

/**
 * Get progress threshold for milestone number
 * @param {number} milestoneNumber - Milestone number
 * @returns {number} Progress threshold percentage
 */
function getProgressThreshold(milestoneNumber) {
  const thresholds = [0, 25, 50, 75, 100];
  return thresholds[milestoneNumber] || 0;
}

/**
 * Check and process milestone completion after lesson watch update
 * 
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {string} lessonId - Lesson UUID
 * @returns {Promise<Object|null>} Milestone completion result or null
 */
export async function detectMilestoneAfterLessonCompletion(studentId, courseId, lessonId) {
  try {
    // Get all milestones for this course
    const milestones = await getCourseMilestones(studentId, courseId);
    
    // Check each milestone that depends on lesson completion
    for (const milestone of milestones) {
      if (milestone.milestone_type === 'module') {
        // Check if this lesson belongs to the milestone's module
        const lessonBelongsToModule = await checkLessonInModule(lessonId, milestone.milestone_reference_id);
        
        if (lessonBelongsToModule) {
          // Check if milestone is now complete
          const isComplete = await checkMilestoneCompletion(
            studentId,
            courseId,
            milestone.milestone_number
          );
          
          if (isComplete && !milestone.stamp_awarded) {
            // Award stamp
            return await awardMilestoneStamp(studentId, courseId, milestone.milestone_number);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting milestone after lesson completion:', error);
    return null;
  }
}

/**
 * Check and process milestone completion after quiz submission
 * 
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {string} quizId - Quiz UUID
 * @param {boolean} isPassed - Whether quiz was passed
 * @returns {Promise<Object|null>} Milestone completion result or null
 */
export async function detectMilestoneAfterQuizSubmission(studentId, courseId, quizId, isPassed) {
  try {
    if (!isPassed) {
      return null; // Only award for passed quizzes
    }
    
    // Get all milestones for this course
    const milestones = await getCourseMilestones(studentId, courseId);
    
    // Find milestone linked to this quiz
    const quizMilestone = milestones.find(
      m => m.milestone_type === 'quiz' && m.milestone_reference_id === quizId
    );
    
    if (quizMilestone && !quizMilestone.stamp_awarded) {
      // Check if milestone is complete
      const isComplete = await checkMilestoneCompletion(
        studentId,
        courseId,
        quizMilestone.milestone_number
      );
      
      if (isComplete) {
        // Award stamp
        return await awardMilestoneStamp(studentId, courseId, quizMilestone.milestone_number);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting milestone after quiz submission:', error);
    return null;
  }
}

/**
 * Check and process milestone completion after assignment submission
 * 
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<Object|null>} Milestone completion result or null
 */
export async function detectMilestoneAfterAssignmentSubmission(studentId, courseId, assignmentId) {
  try {
    // Get all milestones for this course
    const milestones = await getCourseMilestones(studentId, courseId);
    
    // Find milestone linked to this assignment
    const assignmentMilestone = milestones.find(
      m => m.milestone_type === 'assignment' && m.milestone_reference_id === assignmentId
    );
    
    if (assignmentMilestone && !assignmentMilestone.stamp_awarded) {
      // Check if milestone is complete
      const isComplete = await checkMilestoneCompletion(
        studentId,
        courseId,
        assignmentMilestone.milestone_number
      );
      
      if (isComplete) {
        // Award stamp
        return await awardMilestoneStamp(studentId, courseId, assignmentMilestone.milestone_number);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting milestone after assignment submission:', error);
    return null;
  }
}

/**
 * Check and process progress-based milestones
 * 
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {number} currentProgress - Current course progress percentage
 * @returns {Promise<Object|null>} Milestone completion result or null
 */
export async function detectMilestoneAfterProgressUpdate(studentId, courseId, currentProgress) {
  try {
    // Get all milestones for this course
    const milestones = await getCourseMilestones(studentId, courseId);
    
    // Check progress-based milestones
    for (const milestone of milestones) {
      if (milestone.milestone_type === 'progress' && !milestone.stamp_awarded) {
        // Get progress threshold for this milestone
        const threshold = getProgressThreshold(milestone.milestone_number);
        
        if (currentProgress >= threshold) {
          // Check if milestone is complete
          const isComplete = await checkMilestoneCompletion(
            studentId,
            courseId,
            milestone.milestone_number
          );
          
          if (isComplete) {
            // Award stamp
            return await awardMilestoneStamp(studentId, courseId, milestone.milestone_number);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting milestone after progress update:', error);
    return null;
  }
}
