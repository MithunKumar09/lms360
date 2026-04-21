/**
 * Calculate Attempt Statistics
 * 
 * Calculates attempt-level statistics including:
 * - Time taken per attempt
 * - Attempts by date
 * - Completion rate
 */

import { query } from '@/lib/db/index.js';

/**
 * Calculate attempt statistics for a quiz
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} role - User role
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Attempt statistics object
 */
export async function calculateAttemptStats(quizId, role, filters = {}) {
  const { studentId, orgId } = filters;

  // Build WHERE conditions
  let whereConditions = ['qa.quiz_id = $1'];
  const queryParams = [quizId];
  let paramIndex = 2;

  if (role === 'student' && studentId) {
    whereConditions.push(`qa.student_id = $${paramIndex}`);
    queryParams.push(studentId);
    paramIndex++;
  } else if (role === 'admin' && orgId) {
    whereConditions.push(`q.org_id = $${paramIndex}`);
    queryParams.push(orgId);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get overall attempt statistics
  const attemptStatsQuery = `
    SELECT 
      COUNT(*) as total_attempts,
      COUNT(*) FILTER (WHERE qa.status = 'submitted') as completed_attempts,
      COUNT(*) FILTER (WHERE qa.status = 'in_progress') as in_progress_attempts,
      COUNT(*) FILTER (WHERE qa.status = 'timeout') as timeout_attempts,
      COUNT(*) FILTER (WHERE qa.status = 'abandoned') as abandoned_attempts,
      AVG(qa.time_taken_seconds) FILTER (WHERE qa.time_taken_seconds IS NOT NULL) as avg_time_taken,
      MIN(qa.time_taken_seconds) FILTER (WHERE qa.time_taken_seconds IS NOT NULL) as min_time_taken,
      MAX(qa.time_taken_seconds) FILTER (WHERE qa.time_taken_seconds IS NOT NULL) as max_time_taken,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qa.time_taken_seconds) FILTER (WHERE qa.time_taken_seconds IS NOT NULL) as median_time_taken
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE ${whereClause}
  `;

  const attemptStatsResult = await query(attemptStatsQuery, queryParams);
  const stats = attemptStatsResult.rows[0];

  // Get attempts by date (last 30 days)
  const attemptsByDateQuery = `
    SELECT 
      DATE(qa.started_at) as date,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE qa.status = 'submitted') as completed_count
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE ${whereClause}
      AND qa.started_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(qa.started_at)
    ORDER BY date ASC
  `;

  const attemptsByDateResult = await query(attemptsByDateQuery, queryParams);
  const attemptsByDate = attemptsByDateResult.rows.map(row => ({
    date: row.date,
    count: parseInt(row.count, 10),
    completedCount: parseInt(row.completed_count, 10),
  }));

  // Get completion rate over time (weekly)
  const completionRateQuery = `
    SELECT 
      DATE_TRUNC('week', qa.started_at) as week,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE qa.status = 'submitted') as completed
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    WHERE ${whereClause}
      AND qa.started_at >= CURRENT_DATE - INTERVAL '12 weeks'
    GROUP BY DATE_TRUNC('week', qa.started_at)
    ORDER BY week ASC
  `;

  const completionRateResult = await query(completionRateQuery, queryParams);
  const completionRateOverTime = completionRateResult.rows.map(row => ({
    week: row.week,
    total: parseInt(row.total, 10),
    completed: parseInt(row.completed, 10),
    completionRate: row.total > 0 ? (parseInt(row.completed, 10) / parseInt(row.total, 10)) * 100 : 0,
  }));

  const totalAttempts = parseInt(stats.total_attempts || 0, 10);
  const completedAttempts = parseInt(stats.completed_attempts || 0, 10);
  const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;

  return {
    totalAttempts,
    completedAttempts,
    inProgressAttempts: parseInt(stats.in_progress_attempts || 0, 10),
    timeoutAttempts: parseInt(stats.timeout_attempts || 0, 10),
    abandonedAttempts: parseInt(stats.abandoned_attempts || 0, 10),
    completionRate: parseFloat(completionRate.toFixed(2)),
    avgTimeTaken: stats.avg_time_taken ? parseFloat(parseFloat(stats.avg_time_taken).toFixed(2)) : null,
    minTimeTaken: stats.min_time_taken ? parseInt(stats.min_time_taken, 10) : null,
    maxTimeTaken: stats.max_time_taken ? parseInt(stats.max_time_taken, 10) : null,
    medianTimeTaken: stats.median_time_taken ? parseFloat(parseFloat(stats.median_time_taken).toFixed(2)) : null,
    attemptsByDate,
    completionRateOverTime,
  };
}

export default calculateAttemptStats;

