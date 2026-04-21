/**
 * Calculate Historical Trend
 * 
 * Calculates performance trends over time including:
 * - Performance over time
 * - Attempt trends
 */

import { query } from '@/lib/db/index.js';

/**
 * Calculate historical performance trend
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} studentId - Student ID (for student view, optional for instructor/admin)
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Historical trend array
 */
export async function calculateHistoricalTrend(quizId, studentId = null, filters = {}) {
  const { orgId } = filters;

  // Build WHERE conditions
  let whereConditions = ['qa.quiz_id = $1', "qa.status = 'submitted'"];
  const queryParams = [quizId];
  let paramIndex = 2;

  if (studentId) {
    whereConditions.push(`qa.student_id = $${paramIndex}`);
    queryParams.push(studentId);
    paramIndex++;
  } else if (orgId) {
    whereConditions.push(`q.org_id = $${paramIndex}`);
    queryParams.push(orgId);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get historical performance data
  const historicalQuery = `
    SELECT 
      qa.id as attempt_id,
      qa.started_at,
      qa.submitted_at,
      qa.percentage_score,
      qa.marks_obtained,
      qa.is_passed,
      qa.time_taken_seconds,
      ROW_NUMBER() OVER (ORDER BY qa.submitted_at ASC) as attempt_number,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    LEFT JOIN users u ON qa.student_id = u.id
    WHERE ${whereClause}
    ORDER BY qa.submitted_at ASC
  `;

  const historicalResult = await query(historicalQuery, queryParams);
  
  const historicalTrend = historicalResult.rows.map(row => ({
    attemptId: row.attempt_id,
    attemptNumber: parseInt(row.attempt_number, 10),
    submittedAt: row.submitted_at,
    startedAt: row.started_at,
    percentageScore: row.percentage_score ? parseFloat(row.percentage_score) : null,
    marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
    isPassed: row.is_passed,
    timeTakenSeconds: row.time_taken_seconds ? parseInt(row.time_taken_seconds, 10) : null,
    studentName: row.student_name,
    studentEmail: row.student_email,
  }));

  // Calculate trend metrics (moving average, improvement rate)
  const trendMetrics = calculateTrendMetrics(historicalTrend);

  // Group by date for time-series visualization
  const trendByDate = groupTrendByDate(historicalTrend);

  return {
    attempts: historicalTrend,
    trendByDate,
    metrics: trendMetrics,
    totalAttempts: historicalTrend.length,
  };
}

/**
 * Calculate trend metrics from historical data
 */
function calculateTrendMetrics(trend) {
  if (trend.length === 0) {
    return {
      averageScore: null,
      improvementRate: null,
      trendDirection: 'stable',
    };
  }

  const scores = trend.map(t => t.percentageScore).filter(s => s !== null);
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : null;

  // Calculate improvement rate (comparing first half vs second half)
  let improvementRate = null;
  let trendDirection = 'stable';

  if (scores.length >= 4) {
    const midpoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midpoint);
    const secondHalf = scores.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

    improvementRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (improvementRate > 5) {
      trendDirection = 'improving';
    } else if (improvementRate < -5) {
      trendDirection = 'declining';
    }
  }

  return {
    averageScore: averageScore ? parseFloat(averageScore.toFixed(2)) : null,
    improvementRate: improvementRate ? parseFloat(improvementRate.toFixed(2)) : null,
    trendDirection,
  };
}

/**
 * Group trend data by date
 */
function groupTrendByDate(trend) {
  const grouped = {};

  trend.forEach(item => {
    if (!item.submittedAt) return;
    
    const date = new Date(item.submittedAt).toISOString().split('T')[0];
    
    if (!grouped[date]) {
      grouped[date] = {
        date,
        attempts: [],
        averageScore: null,
        count: 0,
      };
    }

    grouped[date].attempts.push(item);
    grouped[date].count++;
  });

  // Calculate average score per date
  Object.keys(grouped).forEach(date => {
    const scores = grouped[date].attempts
      .map(a => a.percentageScore)
      .filter(s => s !== null);
    
    if (scores.length > 0) {
      grouped[date].averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

export default calculateHistoricalTrend;

