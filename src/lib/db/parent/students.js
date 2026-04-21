/**
 * Parent Students Database Utilities
 * 
 * Provides queries for parent's linked children (students).
 * All queries filter by parent-student relationships and respect permissions.
 * 
 * @module db/parent/students
 */

import { query } from '../index.js';

/**
 * Get list of linked children for a parent
 * @param {string} parentId - Parent user UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Array>} Array of student objects
 */
export async function getParentStudents(parentId, orgId) {
  const queryStr = `
    SELECT DISTINCT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url,
      u.status,
      psl.relationship_type,
      psl.is_primary_contact,
      psl.can_view_grades,
      psl.can_view_attendance
    FROM parent_student_links psl
    INNER JOIN users u ON psl.student_user_id = u.id
    WHERE psl.parent_user_id = $1 AND psl.org_id = $2
    ORDER BY psl.is_primary_contact DESC, u.first_name, u.last_name
  `;

  const result = await query(queryStr, [parentId, orgId]);
  
  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    status: row.status,
    relationshipType: row.relationship_type,
    isPrimaryContact: row.is_primary_contact,
    permissions: {
      canViewGrades: row.can_view_grades,
      canViewAttendance: row.can_view_attendance,
      // Note: Additional permission fields (can_view_progress, can_view_achievements, etc.)
      // are available after migration 065_parent_access_settings_schema.sql is applied
      // For now, default to true for these permissions
      canViewProgress: true,
      canViewAchievements: true,
      canViewCertificates: true,
      canViewActivityLog: true,
      canViewEngagementStats: true,
    },
  }));
}

/**
 * Verify parent has access to view a specific student
 * @param {string} parentId - Parent user UUID
 * @param {string} studentId - Student user UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<boolean>} True if parent has access
 */
export async function verifyParentAccessToStudent(parentId, studentId, orgId) {
  const queryStr = `
    SELECT 1
    FROM parent_student_links psl
    WHERE psl.parent_user_id = $1 
      AND psl.student_user_id = $2 
      AND psl.org_id = $3
    LIMIT 1
  `;

  const result = await query(queryStr, [parentId, studentId, orgId]);
  return result.rows.length > 0;
}
