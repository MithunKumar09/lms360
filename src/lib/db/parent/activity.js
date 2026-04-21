/**
 * Parent Student Activity Database Utilities
 * 
 * Provides queries for student activity and engagement data visible to parents.
 * Respects access permissions from parent_student_links and parent_access_settings.
 * 
 * @module db/parent/activity
 */

import { query } from '../index.js';

/**
 * Get student daily activity log
 * @param {string} studentId - Student user UUID
 * @param {string} timeRange - Time range: 'week', 'month', or 'all'
 * @returns {Promise<Array>} Array of daily activity records
 */
export async function getStudentDailyActivity(studentId, timeRange = 'week') {
  let dateFilter = '';
  const params = [studentId];
  
  if (timeRange === 'week') {
    dateFilter = `AND DATE(lwp.last_watched_at) >= CURRENT_DATE - INTERVAL '7 days'`;
  } else if (timeRange === 'month') {
    dateFilter = `AND DATE(lwp.last_watched_at) >= CURRENT_DATE - INTERVAL '30 days'`;
  }
  // 'all' means no date filter

  const queryStr = `
    SELECT 
      DATE(lwp.last_watched_at) as date,
      COUNT(DISTINCT lwp.lesson_id) as activities_count,
      SUM(lwp.watch_duration) as time_spent,
      MAX(lwp.last_watched_at) as last_activity_at,
      CASE WHEN COUNT(DISTINCT lwp.lesson_id) > 0 THEN true ELSE false END as is_active
    FROM lesson_watch_progress lwp
    WHERE lwp.user_id = $1 ${dateFilter}
    GROUP BY DATE(lwp.last_watched_at)
    ORDER BY date DESC
  `;

  const result = await query(queryStr, params);
  
  return result.rows.map(row => ({
    date: row.date,
    activitiesCount: parseInt(row.activities_count || 0, 10),
    timeSpent: parseInt(row.time_spent || 0, 10), // in seconds
    lastActivityAt: row.last_activity_at,
    isActive: row.is_active,
  }));
}

/**
 * Get student engagement statistics
 * @param {string} studentId - Student user UUID
 * @param {string} timeRange - Time range: 'week', 'month', or 'all'
 * @returns {Promise<Object>} Engagement statistics
 */
export async function getStudentEngagementStats(studentId, timeRange = 'week') {
  // Create date filters for different table columns
  let lwpDateFilter = ''; // For lesson_watch_progress.last_watched_at
  let qaDateFilter = ''; // For quiz_attempts.started_at
  let asubDateFilter = ''; // For assignment_submissions.submitted_at
  const params = [studentId];
  
  if (timeRange === 'week') {
    lwpDateFilter = `AND DATE(lwp.last_watched_at) >= CURRENT_DATE - INTERVAL '7 days'`;
    qaDateFilter = `AND DATE(qa.started_at) >= CURRENT_DATE - INTERVAL '7 days'`;
    asubDateFilter = `AND DATE(asub.submitted_at) >= CURRENT_DATE - INTERVAL '7 days'`;
  } else if (timeRange === 'month') {
    lwpDateFilter = `AND DATE(lwp.last_watched_at) >= CURRENT_DATE - INTERVAL '30 days'`;
    qaDateFilter = `AND DATE(qa.started_at) >= CURRENT_DATE - INTERVAL '30 days'`;
    asubDateFilter = `AND DATE(asub.submitted_at) >= CURRENT_DATE - INTERVAL '30 days'`;
  }

  // Get current streak (consecutive days with activity)
  const streakQuery = `
    WITH daily_activity AS (
      SELECT DISTINCT DATE(lwp.last_watched_at) as activity_date
      FROM lesson_watch_progress lwp
      WHERE lwp.user_id = $1 AND lwp.watch_duration > 0
      UNION
      SELECT DISTINCT DATE(qa.started_at) as activity_date
      FROM quiz_attempts qa
      WHERE qa.student_id = $1
      UNION
      SELECT DISTINCT DATE(asub.submitted_at) as activity_date
      FROM assignment_submissions asub
      WHERE asub.student_id = $1
    ),
    ranked_dates AS (
      SELECT 
        activity_date,
        ROW_NUMBER() OVER (ORDER BY activity_date DESC) as rn,
        activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC) || ' days')::INTERVAL as grp
      FROM daily_activity
      WHERE activity_date <= CURRENT_DATE
    ),
    streak_groups AS (
      SELECT 
        grp,
        COUNT(*) as consecutive_days,
        MIN(activity_date) as streak_start,
        MAX(activity_date) as streak_end
      FROM ranked_dates
      GROUP BY grp
      ORDER BY streak_end DESC
    )
    SELECT COALESCE(MAX(consecutive_days), 0) as current_streak
    FROM streak_groups
    WHERE streak_end = CURRENT_DATE - INTERVAL '1 day' OR streak_end = CURRENT_DATE
  `;
  const streakResult = await query(streakQuery, params);
  const currentStreak = parseInt(streakResult.rows[0]?.current_streak || 0, 10);

  // Get total time spent
  const timeSpentQuery = `
    SELECT COALESCE(SUM(lwp.watch_duration), 0) as total_time_spent
    FROM lesson_watch_progress lwp
    WHERE lwp.user_id = $1 ${lwpDateFilter}
  `;
  const timeSpentResult = await query(timeSpentQuery, params);
  const totalTimeSpent = parseInt(timeSpentResult.rows[0]?.total_time_spent || 0, 10);

  // Get active days count
  const activeDaysQuery = `
    SELECT COUNT(DISTINCT DATE(activity_date)) as active_days_count
    FROM (
      SELECT DATE(lwp.last_watched_at) as activity_date
      FROM lesson_watch_progress lwp
      WHERE lwp.user_id = $1 AND lwp.watch_duration > 0 ${lwpDateFilter}
      UNION
      SELECT DATE(qa.started_at) as activity_date
      FROM quiz_attempts qa
      WHERE qa.student_id = $1 ${qaDateFilter}
      UNION
      SELECT DATE(asub.submitted_at) as activity_date
      FROM assignment_submissions asub
      WHERE asub.student_id = $1 ${asubDateFilter}
    ) activities
  `;
  const activeDaysResult = await query(activeDaysQuery, params);
  const activeDaysCount = parseInt(activeDaysResult.rows[0]?.active_days_count || 0, 10);

  // Get weekly activity count
  const weeklyActivityQuery = `
    SELECT COUNT(*) as weekly_activity_count
    FROM (
      SELECT lwp.id FROM lesson_watch_progress lwp
      WHERE lwp.user_id = $1 AND DATE(lwp.last_watched_at) >= CURRENT_DATE - INTERVAL '7 days'
      UNION ALL
      SELECT qa.id FROM quiz_attempts qa
      WHERE qa.student_id = $1 AND DATE(qa.started_at) >= CURRENT_DATE - INTERVAL '7 days'
      UNION ALL
      SELECT asub.id FROM assignment_submissions asub
      WHERE asub.student_id = $1 AND DATE(asub.submitted_at) >= CURRENT_DATE - INTERVAL '7 days'
    ) activities
  `;
  const weeklyActivityResult = await query(weeklyActivityQuery, params);
  const weeklyActivityCount = parseInt(weeklyActivityResult.rows[0]?.weekly_activity_count || 0, 10);

  // Get days since last activity
  // Note: In PostgreSQL, subtracting two DATE values returns an INTEGER (number of days)
  // So we don't need EXTRACT - the result is already the number of days
  const lastActivityQuery = `
    SELECT COALESCE(
      CURRENT_DATE - MAX(activity_date),
      999
    )::integer as days_since_last_activity
    FROM (
      SELECT DATE(lwp.last_watched_at) as activity_date
      FROM lesson_watch_progress lwp
      WHERE lwp.user_id = $1 AND lwp.watch_duration > 0
      UNION
      SELECT DATE(qa.started_at) as activity_date
      FROM quiz_attempts qa
      WHERE qa.student_id = $1
      UNION
      SELECT DATE(asub.submitted_at) as activity_date
      FROM assignment_submissions asub
      WHERE asub.student_id = $1
    ) activities
  `;
  const lastActivityResult = await query(lastActivityQuery, params);
  const daysSinceLastActivity = parseInt(lastActivityResult.rows[0]?.days_since_last_activity || 999, 10);

  // Get weekly summary
  const weeklySummaryQuery = `
    SELECT 
      COUNT(DISTINCT activity_id) as activities_count,
      COALESCE(SUM(time_spent), 0) as time_spent,
      COALESCE(AVG(time_spent), 0) as average_time_per_day
    FROM (
      SELECT 
        lwp.id as activity_id,
        lwp.watch_duration as time_spent,
        DATE(lwp.last_watched_at) as activity_date
      FROM lesson_watch_progress lwp
      WHERE lwp.user_id = $1 AND DATE(lwp.last_watched_at) >= CURRENT_DATE - INTERVAL '7 days'
    ) weekly_activities
  `;
  const weeklySummaryResult = await query(weeklySummaryQuery, params);
  const weeklySummary = {
    activitiesCount: parseInt(weeklySummaryResult.rows[0]?.activities_count || 0, 10),
    timeSpent: parseInt(weeklySummaryResult.rows[0]?.time_spent || 0, 10),
    averageTimePerDay: parseInt(weeklySummaryResult.rows[0]?.average_time_per_day || 0, 10),
  };

  return {
    currentStreak,
    totalTimeSpent,
    activeDaysCount,
    weeklyActivityCount,
    daysSinceLastActivity,
    weeklySummary,
  };
}
