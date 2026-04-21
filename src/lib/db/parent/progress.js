/**
 * Parent Student Progress Database Utilities
 * 
 * Provides queries for student progress data visible to parents.
 * Respects access permissions from parent_student_links and parent_access_settings.
 * 
 * @module db/parent/progress
 */

import { query } from '../index.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';

/**
 * Get student progress overview
 * @param {string} studentId - Student user UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Object>} Progress overview data
 */
export async function getStudentProgressOverview(studentId, orgId) {
  // Get total enrollments
  const enrollmentsQuery = `
    SELECT COUNT(*) as total_enrollments
    FROM course_enrollments ce
    WHERE ce.user_id = $1 AND ce.enrollment_status = 'active'
  `;
  const enrollmentsResult = await query(enrollmentsQuery, [studentId]);
  const totalEnrollments = parseInt(enrollmentsResult.rows[0]?.total_enrollments || 0, 10);

  // Get average completion percentage
  const avgCompletionQuery = `
    SELECT COALESCE(AVG(ce.progress_percentage), 0) as avg_completion
    FROM course_enrollments ce
    WHERE ce.user_id = $1 AND ce.enrollment_status = 'active'
  `;
  const avgCompletionResult = await query(avgCompletionQuery, [studentId]);
  const averageCompletion = parseFloat(avgCompletionResult.rows[0]?.avg_completion || 0);

  // Get attendance percentage (if attendance tracking exists)
  // TODO: Update when attendance system is implemented
  let attendancePercentage = 0;
  try {
    // Placeholder query - replace with actual attendance calculation
    const attendanceQuery = `
      SELECT COALESCE(
        (SELECT COUNT(*) FROM lesson_watch_progress lwp
         WHERE lwp.user_id = $1 AND lwp.completed = true)::NUMERIC / 
        NULLIF((SELECT COUNT(*) FROM course_lessons cl
                WHERE cl.chapter_id IN (
                  SELECT id FROM course_chapters cc
                  WHERE cc.module_id IN (
                    SELECT id FROM course_modules cm
                    WHERE cm.course_id IN (
                      SELECT course_id FROM course_enrollments WHERE user_id = $1
                    )
                  )
                )), 0) * 100,
        0
      ) as attendance_percentage
    `;
    const attendanceResult = await query(attendanceQuery, [studentId]);
    attendancePercentage = parseFloat(attendanceResult.rows[0]?.attendance_percentage || 0);
  } catch (error) {
    console.warn('Attendance calculation error:', error.message);
  }

  // Get overall grade (average of quiz and assignment scores)
  const gradeQuery = `
    SELECT 
      COALESCE(
        (
          (SELECT COALESCE(AVG(qa.percentage_score), 0) FROM quiz_attempts qa
           WHERE qa.student_id = $1 AND qa.status = 'submitted') * 0.5 +
          (SELECT COALESCE(AVG((asub.marks_obtained / NULLIF(a.max_marks, 0)) * 100), 0) 
           FROM assignment_submissions asub
           INNER JOIN assignments a ON asub.assignment_id = a.id
           WHERE asub.student_id = $1 AND asub.status = 'graded') * 0.5
        ),
        0
      ) as overall_grade
  `;
  const gradeResult = await query(gradeQuery, [studentId]);
  const overallGrade = parseFloat(gradeResult.rows[0]?.overall_grade || 0);
  const gradeLetter = overallGrade >= 90 ? 'A' : 
                     overallGrade >= 80 ? 'B' : 
                     overallGrade >= 70 ? 'C' : 
                     overallGrade >= 60 ? 'D' : 'F';

  // Get readiness score (based on course completion and performance)
  const readinessQuery = `
    SELECT COALESCE(
      (
        (SELECT AVG(ce.progress_percentage) FROM course_enrollments ce
         WHERE ce.user_id = $1 AND ce.enrollment_status = 'active') * 0.6 +
        (SELECT COALESCE(AVG(qa.percentage_score), 0) FROM quiz_attempts qa
         WHERE qa.student_id = $1 AND qa.status = 'submitted') * 0.4
      ),
      0
    ) as readiness_score
  `;
  const readinessResult = await query(readinessQuery, [studentId]);
  const readinessScore = parseFloat(readinessResult.rows[0]?.readiness_score || 0);

  // Get milestones completed
  let milestonesCompleted = 0;
  try {
    const milestonesQuery = `
      SELECT COUNT(*) as milestones_completed
      FROM student_milestones sm
      WHERE sm.student_id = $1
    `;
    const milestonesResult = await query(milestonesQuery, [studentId]);
    milestonesCompleted = parseInt(milestonesResult.rows[0]?.milestones_completed || 0, 10);
  } catch (error) {
    console.warn('Milestones query error:', error.message);
  }

  return {
    totalEnrollments,
    averageCompletion: Math.round(averageCompletion * 100) / 100,
    attendancePercentage: Math.round(attendancePercentage * 100) / 100,
    overallGrade: gradeLetter,
    overallGradePercentage: Math.round(overallGrade * 100) / 100,
    readinessScore: Math.round(readinessScore * 100) / 100,
    milestonesCompleted,
  };
}
