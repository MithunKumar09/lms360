/**
 * Course Progress Tracking Utility
 * 
 * Automatically calculates and updates course progress based on
 * assignment and quiz completions.
 * 
 * @module lib/grading/progressTracker
 */

import { query, getClient } from '../db/index.js';

/**
 * Calculate course progress for an enrollment
 * @param {string} enrollmentId - Course enrollment UUID
 * @returns {Promise<Object>} Progress information
 */
export async function calculateCourseProgress(enrollmentId) {
  // Get enrollment details
  const enrollmentQuery = `
    SELECT 
      ce.id,
      ce.course_id,
      ce.user_id,
      ce.progress_percentage,
      ce.enrollment_status,
      c.id as course_id
    FROM course_enrollments ce
    INNER JOIN courses c ON ce.course_id = c.id
    WHERE ce.id = $1
  `;
  const enrollmentResult = await query(enrollmentQuery, [enrollmentId]);

  if (enrollmentResult.rows.length === 0) {
    throw new Error('Enrollment not found');
  }

  const enrollment = enrollmentResult.rows[0];
  const courseId = enrollment.course_id;

  // Count total assignments and quizzes for the course
  const contentQuery = `
    SELECT 
      COUNT(DISTINCT a.id) as total_assignments,
      COUNT(DISTINCT q.id) as total_quizzes
    FROM courses c
    LEFT JOIN assignments a ON a.course_id = c.id AND a.status = 'published'
    LEFT JOIN quizzes q ON q.course_id = c.id AND q.status = 'published'
    WHERE c.id = $1
  `;
  const contentResult = await query(contentQuery, [courseId]);
  const totalAssignments = parseInt(contentResult.rows[0].total_assignments || 0, 10);
  const totalQuizzes = parseInt(contentResult.rows[0].total_quizzes || 0, 10);
  const totalItems = totalAssignments + totalQuizzes;

  if (totalItems === 0) {
    // No assignments or quizzes - progress is 0% or based on lessons watched
    return {
      enrollmentId,
      progressPercentage: 0,
      totalItems: 0,
      completedItems: 0,
      isCompleted: false,
    };
  }

  // Count completed assignments (graded and passed)
  const completedAssignmentsQuery = `
    SELECT COUNT(DISTINCT asub.id) as completed_count
    FROM assignment_submissions asub
    INNER JOIN assignments a ON asub.assignment_id = a.id
    WHERE asub.student_id = $1
      AND a.course_id = $2
      AND asub.status = 'graded'
      AND asub.marks_obtained >= a.passing_marks
  `;
  const completedAssignmentsResult = await query(completedAssignmentsQuery, [
    enrollment.user_id,
    courseId,
  ]);
  const completedAssignments = parseInt(completedAssignmentsResult.rows[0].completed_count || 0, 10);

  // Count completed quizzes (submitted and passed)
  const completedQuizzesQuery = `
    SELECT COUNT(DISTINCT qa.id) as completed_count
    FROM quiz_attempts qa
    INNER JOIN quizzes q ON qa.quiz_id = q.id
    WHERE qa.student_id = $1
      AND q.course_id = $2
      AND qa.status = 'submitted'
      AND qa.is_passed = true
  `;
  const completedQuizzesResult = await query(completedQuizzesQuery, [
    enrollment.user_id,
    courseId,
  ]);
  const completedQuizzes = parseInt(completedQuizzesResult.rows[0].completed_count || 0, 10);

  const completedItems = completedAssignments + completedQuizzes;
  const progressPercentage = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100 * 100) / 100 // Round to 2 decimal places
    : 0;

  return {
    enrollmentId,
    progressPercentage,
    totalItems,
    completedItems,
    totalAssignments,
    completedAssignments,
    totalQuizzes,
    completedQuizzes,
    isCompleted: progressPercentage >= 100,
  };
}

/**
 * Update enrollment progress
 * @param {string} enrollmentId - Course enrollment UUID
 * @param {number} progressPercentage - Progress percentage (0-100)
 * @returns {Promise<Object>} Updated enrollment
 */
export async function updateEnrollmentProgress(enrollmentId, progressPercentage) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progressPercentage));

  const updateQuery = `
    UPDATE course_enrollments
    SET 
      progress_percentage = $1,
      last_accessed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await query(updateQuery, [clampedProgress, enrollmentId]);

  if (result.rows.length === 0) {
    throw new Error('Failed to update enrollment progress');
  }

  return {
    enrollmentId,
    progressPercentage: clampedProgress,
    updatedAt: result.rows[0].updated_at,
  };
}

/**
 * Check if course is completed
 * @param {string} enrollmentId - Course enrollment UUID
 * @returns {Promise<boolean>} Whether course is completed
 */
export async function checkCourseCompletion(enrollmentId) {
  const progress = await calculateCourseProgress(enrollmentId);
  return progress.isCompleted;
}

/**
 * Mark course as complete
 * @param {string} enrollmentId - Course enrollment UUID
 * @returns {Promise<Object>} Updated enrollment
 */
export async function markCourseComplete(enrollmentId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Update progress to 100%
    await updateEnrollmentProgress(enrollmentId, 100);

    // Mark enrollment as completed
    const completeQuery = `
      UPDATE course_enrollments
      SET 
        enrollment_status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        progress_percentage = 100.00,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await client.query(completeQuery, [enrollmentId]);

    await client.query('COMMIT');

    return {
      enrollmentId,
      status: 'completed',
      completedAt: result.rows[0].completed_at,
      progressPercentage: 100,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update course progress after assignment/quiz completion
 * This is the main function to call after auto-grading
 * @param {string} enrollmentId - Course enrollment UUID
 * @returns {Promise<Object>} Updated progress information
 */
export async function updateCourseProgressAfterGrading(enrollmentId) {
  // Calculate current progress
  const progress = await calculateCourseProgress(enrollmentId);

  // Update enrollment with new progress
  await updateEnrollmentProgress(enrollmentId, progress.progressPercentage);

  // If progress is 100%, mark as complete
  if (progress.isCompleted) {
    await markCourseComplete(enrollmentId);
  }

  return progress;
}
