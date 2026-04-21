/**
 * Mentor Activity Feed Database Functions
 * 
 * Utility functions for creating activity feed entries.
 */

import { query } from './index.js';

/**
 * Create an activity feed entry
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string|null} params.studentId - Student UUID (null for cohort-wide activities)
 * @param {string|null} params.cohortId - Cohort UUID (optional)
 * @param {string} params.activityType - Activity type (task_created, task_completed, etc.)
 * @param {Object|null} params.activityData - Activity-specific data as JSON
 * @param {string} params.createdBy - User UUID who created the activity
 * @returns {Promise<Object>} Created activity feed entry
 */
export async function createActivityFeedEntry({
  mentorId,
  studentId = null,
  cohortId = null,
  activityType,
  activityData = null,
  createdBy,
}) {
  const insertQuery = `
    INSERT INTO mentor_activity_feed (
      mentor_id,
      student_id,
      cohort_id,
      activity_type,
      activity_data,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const result = await query(insertQuery, [
    mentorId,
    studentId,
    cohortId,
    activityType,
    activityData ? JSON.stringify(activityData) : null,
    createdBy,
  ]);

  return result.rows[0];
}

/**
 * Create activity feed entry for task creation
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} params.taskTitle - Task title
 * @param {string} params.createdBy - User UUID
 */
export async function createTaskCreatedActivity({
  mentorId,
  studentId,
  cohortId,
  taskId,
  taskTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'task_created',
    activityData: {
      task_id: taskId,
      task_title: taskTitle,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for task completion
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} params.taskTitle - Task title
 * @param {string} params.createdBy - User UUID
 */
export async function createTaskCompletedActivity({
  mentorId,
  studentId,
  cohortId,
  taskId,
  taskTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'task_completed',
    activityData: {
      task_id: taskId,
      task_title: taskTitle,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for task status change to in_progress
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} params.taskTitle - Task title
 * @param {string} params.createdBy - User UUID
 */
export async function createTaskInProgressActivity({
  mentorId,
  studentId,
  cohortId,
  taskId,
  taskTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'task_in_progress',
    activityData: {
      task_id: taskId,
      task_title: taskTitle,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for task update
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} params.taskTitle - Task title
 * @param {string} params.createdBy - User UUID
 */
export async function createTaskUpdatedActivity({
  mentorId,
  studentId,
  cohortId,
  taskId,
  taskTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'task_updated',
    activityData: {
      task_id: taskId,
      task_title: taskTitle,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for task cancellation
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} params.taskTitle - Task title
 * @param {string} params.createdBy - User UUID
 */
export async function createTaskCancelledActivity({
  mentorId,
  studentId,
  cohortId,
  taskId,
  taskTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'task_cancelled',
    activityData: {
      task_id: taskId,
      task_title: taskTitle,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for feedback submission
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.feedbackId - Feedback UUID
 * @param {number} params.rating - Feedback rating (1-5)
 * @param {string} params.createdBy - User UUID
 */
export async function createFeedbackSubmittedActivity({
  mentorId,
  studentId,
  cohortId,
  feedbackId,
  rating,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'feedback_submitted',
    activityData: {
      feedback_id: feedbackId,
      rating: rating,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for task comment
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string} params.studentId - Student UUID
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} params.taskTitle - Task title
 * @param {string} params.commentId - Comment UUID
 * @param {string} params.createdBy - User UUID
 */
export async function createTaskCommentActivity({
  mentorId,
  studentId,
  cohortId,
  taskId,
  taskTitle,
  commentId,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'note_added', // Using note_added as comment type (we can add 'comment_added' to schema later)
    activityData: {
      task_id: taskId,
      task_title: taskTitle,
      comment_id: commentId,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for session scheduled
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string|null} params.studentId - Student UUID (null for group sessions)
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.sessionId - Session UUID
 * @param {string} params.sessionTitle - Session title
 * @param {string} params.createdBy - User UUID
 */
export async function createSessionScheduledActivity({
  mentorId,
  studentId,
  cohortId,
  sessionId,
  sessionTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'session_scheduled',
    activityData: {
      session_id: sessionId,
      session_title: sessionTitle,
    },
    createdBy,
  });
}

/**
 * Create activity feed entry for material shared
 * 
 * @param {Object} params
 * @param {string} params.mentorId - Mentor UUID
 * @param {string|null} params.studentId - Student UUID (null for cohort-wide)
 * @param {string|null} params.cohortId - Cohort UUID
 * @param {string} params.materialId - Material UUID
 * @param {string} params.materialTitle - Material title
 * @param {string} params.createdBy - User UUID
 */
export async function createMaterialSharedActivity({
  mentorId,
  studentId,
  cohortId,
  materialId,
  materialTitle,
  createdBy,
}) {
  return createActivityFeedEntry({
    mentorId,
    studentId,
    cohortId,
    activityType: 'material_shared',
    activityData: {
      material_id: materialId,
      material_title: materialTitle,
    },
    createdBy,
  });
}
