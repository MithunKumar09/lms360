/**
 * Calculate Course-Wise Performance
 * 
 * Calculates performance breakdown by course (admin/superadmin only)
 */

import { query } from '@/lib/db/index.js';

/**
 * Calculate course-wise performance breakdown
 * 
 * @param {string} quizId - Quiz ID (optional, if null calculates for all quizzes)
 * @param {string} orgId - Organization ID (for admin filtering)
 * @returns {Promise<Array>} Course-wise breakdown array
 */
export async function calculateCourseWisePerformance(quizId = null, orgId = null) {
  // Build WHERE conditions
  let whereConditions = ["qa.status = 'submitted'"];
  const queryParams = [];
  let paramIndex = 1;

  if (quizId) {
    whereConditions.push(`qa.quiz_id = $${paramIndex}`);
    queryParams.push(quizId);
    paramIndex++;
  }

  if (orgId) {
    whereConditions.push(`q.org_id = $${paramIndex}`);
    queryParams.push(orgId);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get course-wise performance
  const courseWiseQuery = `
    SELECT 
      COALESCE(c.id, 'standalone') as course_id,
      COALESCE(c.title, 'Standalone Quiz') as course_title,
      COUNT(DISTINCT qa.quiz_id) as quiz_count,
      COUNT(DISTINCT qa.id) as total_attempts,
      COUNT(DISTINCT qa.student_id) as unique_students,
      AVG(qa.percentage_score) as average_score,
      AVG(qa.marks_obtained) as average_marks,
      COUNT(*) FILTER (WHERE qa.is_passed = true) as passed_count,
      COUNT(*) FILTER (WHERE qa.is_passed = false) as failed_count,
      MIN(qa.percentage_score) as min_score,
      MAX(qa.percentage_score) as max_score
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    LEFT JOIN courses c ON q.course_id = c.id
    ${whereClause}
    GROUP BY c.id, c.title
    ORDER BY total_attempts DESC
  `;

  const courseWiseResult = await query(courseWiseQuery, queryParams);

  const courseBreakdown = courseWiseResult.rows.map(row => {
    const totalAttempts = parseInt(row.total_attempts, 10);
    const passedCount = parseInt(row.passed_count, 10);
    const failedCount = parseInt(row.failed_count, 10);
    const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0;

    return {
      courseId: row.course_id,
      courseTitle: row.course_title,
      quizCount: parseInt(row.quiz_count, 10),
      totalAttempts,
      uniqueStudents: parseInt(row.unique_students, 10),
      averageScore: row.average_score ? parseFloat(parseFloat(row.average_score).toFixed(2)) : null,
      averageMarks: row.average_marks ? parseFloat(parseFloat(row.average_marks).toFixed(2)) : null,
      passedCount,
      failedCount,
      passRate: parseFloat(passRate.toFixed(2)),
      minScore: row.min_score ? parseFloat(parseFloat(row.min_score).toFixed(2)) : null,
      maxScore: row.max_score ? parseFloat(parseFloat(row.max_score).toFixed(2)) : null,
    };
  });

  return courseBreakdown;
}

export default calculateCourseWisePerformance;

