/**
 * Ensure Role Access
 * 
 * Validates role-based access to reports
 */

import { query } from '@/lib/db/index.js';

/**
 * Check if user has access to view report for a quiz
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {string} userOrgId - User organization ID
 * @returns {Promise<boolean>} True if user has access
 */
export async function ensureRoleAccess(quizId, userId, userRole, userOrgId = null) {
  try {
    // Get quiz details
    const quizQuery = `
      SELECT id, org_id, course_id, created_by
      FROM quizzes
      WHERE id = $1
    `;
    const quizResult = await query(quizQuery, [quizId]);

    if (quizResult.rows.length === 0) {
      return false; // Quiz not found
    }

    const quiz = quizResult.rows[0];

    // Student: Can only view their own reports
    if (userRole === 'student') {
      // Check if student has any attempts for this quiz
      const studentAttemptQuery = `
        SELECT COUNT(*) as count
        FROM quiz_attempts
        WHERE quiz_id = $1 AND student_id = $2
      `;
      const studentAttemptResult = await query(studentAttemptQuery, [quizId, userId]);
      return parseInt(studentAttemptResult.rows[0].count, 10) > 0;
    }

    // Instructor: Can view reports for quizzes they created or quizzes from their courses
    if (userRole === 'instructor') {
      if (quiz.created_by === userId) {
        return true;
      }

      if (quiz.course_id) {
        const courseQuery = `
          SELECT created_by
          FROM courses
          WHERE id = $1
        `;
        const courseResult = await query(courseQuery, [quiz.course_id]);
        
        if (courseResult.rows.length > 0) {
          return courseResult.rows[0].created_by === userId;
        }
      }

      return false;
    }

    // Admin: Can view reports for quizzes in their organization
    if (userRole === 'admin') {
      if (userOrgId) {
        return quiz.org_id === userOrgId;
      }
      // Admin with no org can only see quizzes they created
      return quiz.created_by === userId;
    }

    // Superadmin: Can view all reports
    if (userRole === 'superadmin') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking role access:', error);
    return false;
  }
}

export default ensureRoleAccess;

