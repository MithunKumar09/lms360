/**
 * Course Progress Database Utilities
 * 
 * Provides helper functions for calculating course progress components.
 * These functions are used by the progress calculation service.
 * 
 * @module db/courses/progress
 */

import { query } from '../index.js';

/**
 * Get total course duration (sum of all lesson durations) in seconds
 * @param {string} courseId - Course UUID
 * @returns {Promise<number>} Total duration in seconds
 */
export async function getCourseTotalDuration(courseId) {
  try {
    const result = await query(
      `SELECT COALESCE(SUM(cl.duration), 0) as total_duration
       FROM course_lessons cl
       JOIN course_chapters cc ON cl.chapter_id = cc.id
       JOIN course_modules cm ON cc.module_id = cm.id
       WHERE cm.course_id = $1`,
      [courseId]
    );
    
    return parseInt(result.rows[0]?.total_duration || 0, 10);
  } catch (error) {
    console.error('Error getting course total duration:', error);
    throw error;
  }
}

/**
 * Get total watched duration for a student in a course (in seconds)
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<number>} Total watched duration in seconds
 */
export async function getStudentWatchedDuration(studentId, courseId) {
  try {
    const result = await query(
      `SELECT COALESCE(SUM(lwp.watch_duration), 0) as total_watched
       FROM lesson_watch_progress lwp
       JOIN course_lessons cl ON lwp.lesson_id = cl.id
       JOIN course_chapters cc ON cl.chapter_id = cc.id
       JOIN course_modules cm ON cc.module_id = cm.id
       WHERE lwp.user_id = $1 AND cm.course_id = $2`,
      [studentId, courseId]
    );
    
    return parseInt(result.rows[0]?.total_watched || 0, 10);
  } catch (error) {
    console.error('Error getting student watched duration:', error);
    throw error;
  }
}

/**
 * Get assignment scores for a student in a course
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<Object>} Object with totalMarks and obtainedMarks
 */
export async function getStudentAssignmentScores(studentId, courseId) {
  try {
    const result = await query(
      `SELECT 
         COALESCE(SUM(a.max_marks), 0) as total_marks,
         COALESCE(SUM(COALESCE(asub.marks_obtained, 0)), 0) as obtained_marks,
         COUNT(a.id) as total_assignments,
         COUNT(asub.id) as submitted_assignments
       FROM assignments a
       LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_id = $1
       WHERE a.course_id = $2 AND a.status = 'published'`,
      [studentId, courseId]
    );
    
    const row = result.rows[0];
    return {
      totalMarks: parseFloat(row?.total_marks || 0),
      obtainedMarks: parseFloat(row?.obtained_marks || 0),
      totalAssignments: parseInt(row?.total_assignments || 0, 10),
      submittedAssignments: parseInt(row?.submitted_assignments || 0, 10),
    };
  } catch (error) {
    console.error('Error getting student assignment scores:', error);
    throw error;
  }
}

/**
 * Get quiz scores for a student in a course
 * Returns the best attempt for each quiz
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<Object>} Object with totalMarks and obtainedMarks
 */
export async function getStudentQuizScores(studentId, courseId) {
  try {
    // Get best attempt per quiz (highest marks_obtained or percentage_score)
    const result = await query(
      `WITH quiz_attempts_ranked AS (
         SELECT 
           q.id as quiz_id,
           q.total_marks,
           qa.marks_obtained,
           qa.percentage_score,
           ROW_NUMBER() OVER (
             PARTITION BY q.id 
             ORDER BY 
               COALESCE(qa.percentage_score, (qa.marks_obtained / NULLIF(q.total_marks, 0)) * 100) DESC,
               qa.submitted_at DESC
           ) as attempt_rank
         FROM quizzes q
         LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
         WHERE q.course_id = $2 AND q.status = 'published'
       )
       SELECT 
         COALESCE(SUM(total_marks), 0) as total_marks,
         COALESCE(SUM(COALESCE(marks_obtained, 0)), 0) as obtained_marks,
         COUNT(DISTINCT quiz_id) as total_quizzes,
         COUNT(DISTINCT CASE WHEN marks_obtained IS NOT NULL THEN quiz_id END) as attempted_quizzes
       FROM quiz_attempts_ranked
       WHERE attempt_rank = 1`,
      [studentId, courseId]
    );
    
    const row = result.rows[0];
    return {
      totalMarks: parseFloat(row?.total_marks || 0),
      obtainedMarks: parseFloat(row?.obtained_marks || 0),
      totalQuizzes: parseInt(row?.total_quizzes || 0, 10),
      attemptedQuizzes: parseInt(row?.attempted_quizzes || 0, 10),
    };
  } catch (error) {
    console.error('Error getting student quiz scores:', error);
    throw error;
  }
}

/**
 * Check if student is enrolled in a course
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<boolean>} True if enrolled
 */
export async function isStudentEnrolled(studentId, courseId) {
  try {
    const result = await query(
      `SELECT 1
       FROM course_enrollments
       WHERE course_id = $1 AND user_id = $2 AND enrollment_status = 'active'
       LIMIT 1`,
      [courseId, studentId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    throw error;
  }
}

