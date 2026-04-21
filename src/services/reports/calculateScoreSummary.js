/**
 * Calculate Score Summary
 * 
 * Calculates comprehensive score statistics for a quiz including:
 * - Total attempts
 * - Highest/lowest/average score
 * - Pass/fail count
 * - Score distribution buckets
 */

import { query } from '@/lib/db/index.js';

/**
 * Calculate score summary for a quiz
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} role - User role (student | instructor | admin | superadmin)
 * @param {Object} filters - Additional filters (studentId, orgId, etc.)
 * @returns {Promise<Object>} Score summary object
 */
export async function calculateScoreSummary(quizId, role, filters = {}) {
  const { studentId, orgId } = filters;

  // Build WHERE conditions based on role
  let whereConditions = ['qa.quiz_id = $1', "qa.status = 'submitted'"];
  const queryParams = [quizId];
  let paramIndex = 2;

  // Role-based filtering
  if (role === 'student' && studentId) {
    whereConditions.push(`qa.student_id = $${paramIndex}`);
    queryParams.push(studentId);
    paramIndex++;
  } else if (role === 'admin' && orgId) {
    whereConditions.push(`q.org_id = $${paramIndex}`);
    queryParams.push(orgId);
    paramIndex++;
  }
  // Instructor and superadmin see all attempts for the quiz (no additional filter)

  const whereClause = whereConditions.join(' AND ');

  // Get comprehensive score statistics
  const scoreQuery = `
    SELECT 
      COUNT(*) as total_attempts,
      COUNT(*) FILTER (WHERE qa.is_passed = true) as passed_count,
      COUNT(*) FILTER (WHERE qa.is_passed = false) as failed_count,
      AVG(qa.percentage_score) as average_score,
      AVG(qa.marks_obtained) as average_marks,
      MIN(qa.percentage_score) as min_score,
      MAX(qa.percentage_score) as max_score,
      MIN(qa.marks_obtained) as min_marks,
      MAX(qa.marks_obtained) as max_marks,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qa.percentage_score) as median_score,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY qa.percentage_score) as q1_score,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY qa.percentage_score) as q3_score
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE ${whereClause}
  `;

  const scoreResult = await query(scoreQuery, queryParams);
  const scoreData = scoreResult.rows[0];

  // Get score distribution buckets
  const distributionQuery = `
    SELECT 
      CASE
        WHEN qa.percentage_score >= 90 THEN '90-100'
        WHEN qa.percentage_score >= 80 THEN '80-89'
        WHEN qa.percentage_score >= 70 THEN '70-79'
        WHEN qa.percentage_score >= 60 THEN '60-69'
        WHEN qa.percentage_score >= 50 THEN '50-59'
        WHEN qa.percentage_score >= 40 THEN '40-49'
        WHEN qa.percentage_score >= 30 THEN '30-39'
        WHEN qa.percentage_score >= 20 THEN '20-29'
        WHEN qa.percentage_score >= 10 THEN '10-19'
        WHEN qa.percentage_score >= 0 THEN '0-9'
        ELSE 'N/A'
      END as score_range,
      COUNT(*) as count
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE ${whereClause} AND qa.percentage_score IS NOT NULL
    GROUP BY score_range
    ORDER BY 
      CASE score_range
        WHEN '90-100' THEN 1
        WHEN '80-89' THEN 2
        WHEN '70-79' THEN 3
        WHEN '60-69' THEN 4
        WHEN '50-59' THEN 5
        WHEN '40-49' THEN 6
        WHEN '30-39' THEN 7
        WHEN '20-29' THEN 8
        WHEN '10-19' THEN 9
        WHEN '0-9' THEN 10
        ELSE 11
      END
  `;

  const distributionResult = await query(distributionQuery, queryParams);
  const distribution = distributionResult.rows.map(row => ({
    range: row.score_range,
    count: parseInt(row.count, 10),
  }));

  const totalAttempts = parseInt(scoreData.total_attempts || 0, 10);
  const passedCount = parseInt(scoreData.passed_count || 0, 10);
  const failedCount = parseInt(scoreData.failed_count || 0, 10);
  const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0;

  return {
    totalAttempts,
    passedCount,
    failedCount,
    passRate: parseFloat(passRate.toFixed(2)),
    averageScore: scoreData.average_score ? parseFloat(parseFloat(scoreData.average_score).toFixed(2)) : null,
    averageMarks: scoreData.average_marks ? parseFloat(parseFloat(scoreData.average_marks).toFixed(2)) : null,
    minScore: scoreData.min_score ? parseFloat(parseFloat(scoreData.min_score).toFixed(2)) : null,
    maxScore: scoreData.max_score ? parseFloat(parseFloat(scoreData.max_score).toFixed(2)) : null,
    minMarks: scoreData.min_marks ? parseFloat(parseFloat(scoreData.min_marks).toFixed(2)) : null,
    maxMarks: scoreData.max_marks ? parseFloat(parseFloat(scoreData.max_marks).toFixed(2)) : null,
    medianScore: scoreData.median_score ? parseFloat(parseFloat(scoreData.median_score).toFixed(2)) : null,
    q1Score: scoreData.q1_score ? parseFloat(parseFloat(scoreData.q1_score).toFixed(2)) : null,
    q3Score: scoreData.q3_score ? parseFloat(parseFloat(scoreData.q3_score).toFixed(2)) : null,
    distribution,
  };
}

export default calculateScoreSummary;

