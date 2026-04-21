/**
 * Parent Dashboard Statistics Database Utilities
 * 
 * Provides parent-specific dashboard statistics queries.
 * All queries filter by parent's linked children and respect access permissions.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/parent/statistics
 */

import { query } from '../index.js';

/**
 * Verify parent-student relationship and get permissions
 * @param {string} parentId - Parent user UUID
 * @param {string} studentId - Student user UUID (optional, if null checks all children)
 * @returns {Promise<Object|null>} Relationship data with permissions or null
 */
export async function verifyParentStudentRelationship(parentId, studentId = null) {
  const conditions = ['psl.parent_user_id = $1'];
  const params = [parentId];
  let paramIndex = 2;

  if (studentId) {
    conditions.push(`psl.student_user_id = $${paramIndex}`);
    params.push(studentId);
    paramIndex++;
  }

  const queryStr = `
    SELECT 
      psl.id,
      psl.parent_user_id,
      psl.student_user_id,
      psl.org_id,
      psl.can_view_grades,
      psl.can_view_attendance
    FROM parent_student_links psl
    WHERE ${conditions.join(' AND ')}
    ${studentId ? 'LIMIT 1' : ''}
  `;
  
  // Note: Additional permission fields (can_view_progress, can_view_achievements, etc.)
  // are available after migration 065_parent_access_settings_schema.sql is applied

  const result = await query(queryStr, params);
  return studentId ? (result.rows[0] || null) : result.rows;
}

/**
 * Get parent access settings with priority resolution
 * Priority: student-specific > parent-specific > org-wide > defaults
 * @param {string} parentId - Parent user UUID
 * @param {string} studentId - Student user UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Object>} Effective access permissions
 */
export async function getParentAccessSettings(parentId, studentId, orgId) {
  // Default permissions (all true)
  const defaults = {
    can_view_progress: true,
    can_view_attendance: true,
    can_view_achievements: true,
    can_view_certificates: true,
    can_view_activity_log: true,
    can_view_engagement_stats: true,
  };

  // Get student-specific override (highest priority)
  const studentOverride = await query(
    `SELECT * FROM parent_access_settings
     WHERE org_id = $1 AND parent_user_id = $2 AND student_user_id = $3
     LIMIT 1`,
    [orgId, parentId, studentId]
  );

  if (studentOverride.rows.length > 0) {
    const settings = studentOverride.rows[0];
    return {
      can_view_progress: settings.can_view_progress,
      can_view_attendance: settings.can_view_attendance,
      can_view_achievements: settings.can_view_achievements,
      can_view_certificates: settings.can_view_certificates,
      can_view_activity_log: settings.can_view_activity_log,
      can_view_engagement_stats: settings.can_view_engagement_stats,
    };
  }

  // Get parent-specific default (medium priority)
  const parentDefault = await query(
    `SELECT * FROM parent_access_settings
     WHERE org_id = $1 AND parent_user_id = $2 AND student_user_id IS NULL
     LIMIT 1`,
    [orgId, parentId]
  );

  if (parentDefault.rows.length > 0) {
    const settings = parentDefault.rows[0];
    return {
      can_view_progress: settings.can_view_progress,
      can_view_attendance: settings.can_view_attendance,
      can_view_achievements: settings.can_view_achievements,
      can_view_certificates: settings.can_view_certificates,
      can_view_activity_log: settings.can_view_activity_log,
      can_view_engagement_stats: settings.can_view_engagement_stats,
    };
  }

  // Get org-wide default (low priority)
  const orgDefault = await query(
    `SELECT * FROM parent_access_settings
     WHERE org_id = $1 AND parent_user_id IS NULL AND student_user_id IS NULL
     LIMIT 1`,
    [orgId]
  );

  if (orgDefault.rows.length > 0) {
    const settings = orgDefault.rows[0];
    return {
      can_view_progress: settings.can_view_progress,
      can_view_attendance: settings.can_view_attendance,
      can_view_achievements: settings.can_view_achievements,
      can_view_certificates: settings.can_view_certificates,
      can_view_activity_log: settings.can_view_activity_log,
      can_view_engagement_stats: settings.can_view_engagement_stats,
    };
  }

  // Return defaults if no settings found
  return defaults;
}

/**
 * Get comprehensive parent dashboard statistics
 * @param {string} parentId - Parent user UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Object>} Dashboard statistics object
 */
export async function getParentDashboardStatistics(parentId, orgId) {
  // Get linked children count
  const childrenQuery = `
    SELECT COUNT(DISTINCT psl.student_user_id) as linked_children
    FROM parent_student_links psl
    WHERE psl.parent_user_id = $1 AND psl.org_id = $2
  `;
  const childrenResult = await query(childrenQuery, [parentId, orgId]);
  const linkedChildren = parseInt(childrenResult.rows[0]?.linked_children || 0, 10);

  // Get active enrollments across all linked children
  const activeEnrollmentsQuery = `
    SELECT COUNT(DISTINCT ce.id) as active_enrollments
    FROM course_enrollments ce
    INNER JOIN parent_student_links psl ON ce.user_id = psl.student_user_id
    WHERE psl.parent_user_id = $1 
      AND psl.org_id = $2
      AND ce.enrollment_status = 'active'
  `;
  const activeEnrollmentsResult = await query(activeEnrollmentsQuery, [parentId, orgId]);
  const activeEnrollments = parseInt(activeEnrollmentsResult.rows[0]?.active_enrollments || 0, 10);

  // Get completed courses across all linked children
  const completedCoursesQuery = `
    SELECT COUNT(DISTINCT ce.id) as completed_courses
    FROM course_enrollments ce
    INNER JOIN parent_student_links psl ON ce.user_id = psl.student_user_id
    WHERE psl.parent_user_id = $1 
      AND psl.org_id = $2
      AND ce.enrollment_status = 'completed'
  `;
  const completedCoursesResult = await query(completedCoursesQuery, [parentId, orgId]);
  const completedCourses = parseInt(completedCoursesResult.rows[0]?.completed_courses || 0, 10);

  // Get achievements earned (if milestone/achievement system exists)
  // TODO: Update this query when achievement system is implemented
  const achievementsQuery = `
    SELECT COUNT(DISTINCT sm.id) as achievements_earned
    FROM student_milestones sm
    INNER JOIN parent_student_links psl ON sm.student_id = psl.student_user_id
    WHERE psl.parent_user_id = $1 AND psl.org_id = $2
  `;
  let achievementsEarned = 0;
  try {
    const achievementsResult = await query(achievementsQuery, [parentId, orgId]);
    achievementsEarned = parseInt(achievementsResult.rows[0]?.achievements_earned || 0, 10);
  } catch (error) {
    // Table might not exist yet, default to 0
    console.warn('Achievements table may not exist:', error.message);
  }

  return {
    linkedChildren,
    activeEnrollments,
    completedCourses,
    achievementsEarned,
  };
}
