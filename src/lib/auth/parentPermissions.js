/**
 * Parent Permissions Utilities
 * 
 * Provides permission checking for parent role that integrates with:
 * - parent_student_links relationship validation
 * - parent_access_settings feature flags
 * 
 * These functions check both the base permission AND the database-level
 * access control settings to ensure parents can only access what they're
 * allowed to see.
 */

import { query } from '@/lib/db/index.js';
import { Permission, hasPermission } from './permissions.js';

/**
 * Get parent access settings for a specific parent-student relationship
 * 
 * Priority resolution order (highest to lowest):
 * 1. Per-student override (parent_user_id + student_user_id)
 * 2. Per-parent default (parent_user_id only)
 * 3. Organization-wide default (org_id only)
 * 
 * Note: The parent_access_settings table is created by migration 065_parent_access_settings_schema.sql
 * If the table doesn't exist, this function returns default settings (all enabled)
 * 
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} Access settings object
 */
export async function getParentAccessSettings(parentId, studentId, orgId) {
  try {
    // First, check per-student override
    const studentOverrideQuery = `
      SELECT 
        can_view_progress,
        can_view_attendance,
        can_view_achievements,
        can_view_certificates,
        can_view_activity_log,
        can_view_engagement_stats
      FROM parent_access_settings
      WHERE org_id = $1 
        AND parent_user_id = $2 
        AND student_user_id = $3
      LIMIT 1
    `;
    const studentOverride = await query(studentOverrideQuery, [orgId, parentId, studentId]);
    
    if (studentOverride.rows.length > 0) {
      return studentOverride.rows[0];
    }

    // Second, check per-parent default
    const parentDefaultQuery = `
      SELECT 
        can_view_progress,
        can_view_attendance,
        can_view_achievements,
        can_view_certificates,
        can_view_activity_log,
        can_view_engagement_stats
      FROM parent_access_settings
      WHERE org_id = $1 
        AND parent_user_id = $2 
        AND student_user_id IS NULL
      LIMIT 1
    `;
    const parentDefault = await query(parentDefaultQuery, [orgId, parentId]);
    
    if (parentDefault.rows.length > 0) {
      return parentDefault.rows[0];
    }

    // Third, check organization-wide default
    const orgDefaultQuery = `
      SELECT 
        can_view_progress,
        can_view_attendance,
        can_view_achievements,
        can_view_certificates,
        can_view_activity_log,
        can_view_engagement_stats
      FROM parent_access_settings
      WHERE org_id = $1 
        AND parent_user_id IS NULL 
        AND student_user_id IS NULL
      LIMIT 1
    `;
    const orgDefault = await query(orgDefaultQuery, [orgId]);
    
    if (orgDefault.rows.length > 0) {
      return orgDefault.rows[0];
    }
  } catch (error) {
    // Table might not exist yet (migration 065 not applied)
    // Return default settings
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[parentPermissions] parent_access_settings table may not exist:', error.message);
    }
  }

  // If no settings found or table doesn't exist, return default (all enabled)
  return {
    can_view_progress: true,
    can_view_attendance: true,
    can_view_achievements: true,
    can_view_certificates: true,
    can_view_activity_log: true,
    can_view_engagement_stats: true,
  };
}

/**
 * Get parent-student link permissions
 * 
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} Link permissions object
 */
export async function getParentStudentLinkPermissions(parentId, studentId, orgId) {
  // Only query columns that exist in the current schema
  // Additional permission columns (can_view_progress, can_view_achievements, etc.)
  // are available after migration 065_parent_access_settings_schema.sql is applied
  const linkQuery = `
    SELECT 
      can_view_grades,
      can_view_attendance
    FROM parent_student_links
    WHERE parent_user_id = $1 
      AND student_user_id = $2 
      AND org_id = $3
    LIMIT 1
  `;
  const result = await query(linkQuery, [parentId, studentId, orgId]);
  
  if (result.rows.length === 0) {
    return null; // No link exists
  }

  const row = result.rows[0];
  
  // Return with defaults for columns that don't exist yet
  // These will be actual columns after migration 065 is applied
  return {
    ...row,
    can_view_progress: true, // Default to true until migration adds the column
    can_view_achievements: true,
    can_view_certificates: true,
    can_view_activity_log: true,
    can_view_engagement_stats: true,
  };
}

/**
 * Check if parent has permission to view student progress
 * 
 * @param {string} userRole - User role
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Whether parent can view progress
 */
export async function canViewStudentProgress(userRole, parentId, studentId, orgId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.PARENT_STUDENT_PROGRESS_VIEW)) {
    return false;
  }

  // Check parent-student link exists
  const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
  if (!linkPermissions || !linkPermissions.can_view_progress) {
    return false;
  }

  // Check access settings
  const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
  return accessSettings.can_view_progress === true;
}

/**
 * Check if parent has permission to view attendance
 * 
 * @param {string} userRole - User role
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Whether parent can view attendance
 */
export async function canViewAttendance(userRole, parentId, studentId, orgId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.PARENT_ATTENDANCE_VIEW)) {
    return false;
  }

  // Check parent-student link exists
  const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
  if (!linkPermissions || !linkPermissions.can_view_attendance) {
    return false;
  }

  // Check access settings
  const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
  return accessSettings.can_view_attendance === true;
}

/**
 * Check if parent has permission to view achievements
 * 
 * @param {string} userRole - User role
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Whether parent can view achievements
 */
export async function canViewAchievements(userRole, parentId, studentId, orgId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.PARENT_ACHIEVEMENTS_VIEW)) {
    return false;
  }

  // Check parent-student link exists
  const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
  if (!linkPermissions || !linkPermissions.can_view_achievements) {
    return false;
  }

  // Check access settings
  const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
  return accessSettings.can_view_achievements === true;
}

/**
 * Check if parent has permission to view activity log
 * 
 * @param {string} userRole - User role
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Whether parent can view activity log
 */
export async function canViewActivityLog(userRole, parentId, studentId, orgId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.PARENT_ACTIVITY_LOG_VIEW)) {
    return false;
  }

  // Check parent-student link exists
  const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
  if (!linkPermissions || !linkPermissions.can_view_activity_log) {
    return false;
  }

  // Check access settings
  const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
  return accessSettings.can_view_activity_log === true;
}

/**
 * Verify parent-student relationship exists
 * 
 * @param {string} parentId - Parent user ID
 * @param {string} studentId - Student user ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Whether relationship exists
 */
export async function verifyParentStudentRelationship(parentId, studentId, orgId) {
  const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
  return linkPermissions !== null;
}

export default {
  getParentAccessSettings,
  getParentStudentLinkPermissions,
  canViewStudentProgress,
  canViewAttendance,
  canViewAchievements,
  canViewActivityLog,
  verifyParentStudentRelationship,
};
