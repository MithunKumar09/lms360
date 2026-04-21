//src/lib/services/streakService.js
/**
 * Streak Service (Production-Grade)
 * 
 * Calculates student streak based on actual activity:
 * - Milestone completions (student_course_milestones.completed_at)
 * - Stamp awards (student_stamps.awarded_at)
 * 
 * A "streak" is consecutive calendar days with at least one activity.
 * All timestamps are normalized to UTC day boundaries.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get all active days for a student (last 365 days)
 * Returns deduplicated, sorted array of UTC dates with activities
 * 
 * @param {string} userId - Student user ID
 * @returns {Promise<Array<string>>} - Array of ISO date strings (YYYY-MM-DD), sorted DESC
 */
async function getActiveDays(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  // Query combines milestone completions and stamp awards
  // Uses UTC date truncation to avoid timezone issues
  // DISTINCT removes duplicate days if multiple activities occurred
  const activityQuery = `
    SELECT DISTINCT (activity_timestamp::DATE)::TEXT as activity_date
    FROM (
      -- Milestone completions
      SELECT completed_at as activity_timestamp
      FROM student_course_milestones
      WHERE student_id = $1
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '365 days'
      
      UNION
      
      -- Stamp awards
      SELECT awarded_at as activity_timestamp
      FROM student_stamps
      WHERE student_id = $1
        AND awarded_at >= NOW() - INTERVAL '365 days'
    ) as combined_activities
    ORDER BY activity_date DESC
  `;

  const result = await query(activityQuery, [userId]);
  return (result?.rows || []).map(row => row.activity_date);
}

/**
 * Calculate current streak
 * Walks backwards from today, counting consecutive days with activity
 * Stops at first gap
 * 
 * @param {Array<string>} activeDays - ISO date strings (YYYY-MM-DD) sorted DESC
 * @returns {number} - Current streak (0 if no activity today/yesterday)
 */
function calculateCurrentStreak(activeDays) {
  if (activeDays.length === 0) return 0;

  // Get today's date in UTC (YYYY-MM-DD)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  let streak = 0;
  let expectedDateStr = todayStr;

  for (const activeDate of activeDays) {
    // Parse ISO date string
    const [year, month, day] = expectedDateStr.split('-').map(Number);
    const expectedDate = new Date(Date.UTC(year, month - 1, day));
    
    // Compare active date to expected date
    if (activeDate === expectedDateStr) {
      // Activity found on expected day
      streak++;
      // Move to previous day
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
      expectedDateStr = expectedDate.toISOString().split('T')[0];
    } else {
      // Gap found - streak breaks
      break;
    }
  }

  return streak;
}

/**
 * Calculate highest streak ever
 * Iterates through all activity days and finds longest consecutive sequence
 * 
 * @param {Array<string>} activeDays - ISO date strings (YYYY-MM-DD) sorted DESC
 * @returns {number} - Highest streak ever recorded
 */
function calculateHighestStreak(activeDays) {
  if (activeDays.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 1;

  // Walk through sorted dates and find longest consecutive sequence
  for (let i = 1; i < activeDays.length; i++) {
    const prevDate = new Date(activeDays[i - 1]);
    const currDate = new Date(activeDays[i]);
    
    // Check if dates are consecutive (differ by exactly 1 day)
    const diffMs = prevDate - currDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (Math.abs(diffDays - 1) < 0.01) {
      // Consecutive day
      currentStreak++;
    } else {
      // Gap found
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 1;
    }
  }

  // Don't forget to check the last streak
  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
}

/**
 * Calculate consistency percentage
 * (Days with activity / Total days in last 365) * 100
 * 
 * @param {Array<string>} activeDays - ISO date strings (YYYY-MM-DD)
 * @returns {number} - Consistency percentage (0-100)
 */
function calculateConsistency(activeDays) {
  const totalDays = 365; // Last 365 days
  const activeDayCount = activeDays.length;
  return Math.round((activeDayCount / totalDays) * 100);
}

/**
 * Build calendar data for a specific month
 * Maps each day to "done" (activity), "missed" (no activity), or "unknown"
 * 
 * @param {number} year - Year (2026, etc)
 * @param {number} month - Month (1-12)
 * @param {Array<string>} activeDays - ISO date strings (YYYY-MM-DD)
 * @returns {Object} - { date: "2026-01-01", status: "done" | "missed" }[]
 */
function buildMonthCalendar(year, month, activeDays) {
  const activeDaySet = new Set(activeDays);
  const calendar = [];

  // Today in UTC (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    let status;

    if (dateStr < todayStr) {
      // Past date
      status = activeDaySet.has(dateStr) ? 'done' : 'missed';
    } else if (dateStr === todayStr) {
      // Today
      status = activeDaySet.has(dateStr) ? 'done' : 'unknown';
    } else {
      // Future date
      status = 'unknown';
    }

    calendar.push({ date: dateStr, status });
  }

  return calendar;
}


/**
 * Get last active date
 * 
 * @param {Array<string>} activeDays - ISO date strings (YYYY-MM-DD) sorted DESC
 * @returns {string|null} - ISO date string or null if no activity
 */
function getLastActiveDate(activeDays) {
  return activeDays.length > 0 ? activeDays[0] : null;
}

/**
 * Calculate comprehensive streak data
 * 
 * @param {string} userId - Student user ID
 * @returns {Promise<Object>} - Streak data with currentStreak, highestStreak, consistency, calendar, etc.
 */
export async function calculateStreakData(userId) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    // Fetch active days from DB
    const activeDays = await getActiveDays(userId);

    // Calculate all streak metrics
    const currentStreak = calculateCurrentStreak(activeDays);
    const highestStreak = calculateHighestStreak(activeDays);
    const consistency = calculateConsistency(activeDays);
    const lastActiveDate = getLastActiveDate(activeDays);

    // Build calendar for current month
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    const calendar = buildMonthCalendar(currentYear, currentMonth, activeDays);

    return {
      currentStreak,
      highestStreak,
      consistency,
      lastActiveDate,
      calendar,
      source: activeDays.length > 0 ? 'activity' : 'new_user',
    };
  } catch (error) {
    console.error('Error calculating streak data:', error);
    // Log the error clearly - do NOT silently swallow
    console.error('Streak calculation failed:', {
      userId,
      errorMessage: error.message,
      errorCode: error.code,
    });
    
    // Return fallback with error indication
    return {
      currentStreak: 0,
      highestStreak: 0,
      consistency: 0,
      lastActiveDate: null,
      calendar: [],
      source: 'error',
      error: error.message,
    };
  }
}

/**
 * Get student streak data (main export)
 * Wrapper for backward compatibility if needed
 * 
 * @param {string} userId - Student user ID
 * @returns {Promise<Object>} - Streak data
 */
export async function getStudentStreakData(userId) {
  return calculateStreakData(userId);
}
