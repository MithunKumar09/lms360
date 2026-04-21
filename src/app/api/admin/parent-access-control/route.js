/**
 * Admin Parent Access Control API Route
 * 
 * GET /api/admin/parent-access-control - Get parent access control settings
 * PUT /api/admin/parent-access-control - Update parent access control settings
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * GET /api/admin/parent-access-control
 * Get parent access control settings for an organization
 */
export async function GET(request) {
  try {
    // Authentication: Only admin and superadmin
    const session = await requireRole(request, ['admin', 'superadmin']);
    const orgId = session.user.orgId;

    if (!orgId && session.user.role !== 'superadmin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const studentId = searchParams.get('student_id');

    let queryStr = '';
    let queryParams = [];
    let paramIndex = 1;

    if (orgId) {
      queryStr = `
        SELECT 
          pas.*,
          u_parent.email as parent_email,
          u_parent.first_name as parent_first_name,
          u_parent.last_name as parent_last_name,
          u_student.email as student_email,
          u_student.first_name as student_first_name,
          u_student.last_name as student_last_name
        FROM parent_access_settings pas
        LEFT JOIN users u_parent ON pas.parent_user_id = u_parent.id
        LEFT JOIN users u_student ON pas.student_user_id = u_student.id
        WHERE pas.org_id = $${paramIndex}
      `;
      queryParams.push(orgId);
      paramIndex++;

      if (parentId) {
        queryStr += ` AND pas.parent_user_id = $${paramIndex}`;
        queryParams.push(parentId);
        paramIndex++;
      }

      if (studentId) {
        queryStr += ` AND pas.student_user_id = $${paramIndex}`;
        queryParams.push(studentId);
        paramIndex++;
      }

      queryStr += ` ORDER BY pas.created_at DESC`;
    } else {
      // Superadmin can view all
      queryStr = `
        SELECT 
          pas.*,
          o.name as org_name,
          u_parent.email as parent_email,
          u_parent.first_name as parent_first_name,
          u_parent.last_name as parent_last_name,
          u_student.email as student_email,
          u_student.first_name as student_first_name,
          u_student.last_name as student_last_name
        FROM parent_access_settings pas
        LEFT JOIN organizations o ON pas.org_id = o.id
        LEFT JOIN users u_parent ON pas.parent_user_id = u_parent.id
        LEFT JOIN users u_student ON pas.student_user_id = u_student.id
        ORDER BY pas.created_at DESC
      `;
    }

    const result = await query(queryStr, queryParams);

    const settings = result.rows.map(row => ({
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name || null,
      parentUserId: row.parent_user_id,
      parentEmail: row.parent_email,
      parentName: row.parent_first_name && row.parent_last_name
        ? `${row.parent_first_name} ${row.parent_last_name}`
        : row.parent_email,
      studentUserId: row.student_user_id,
      studentEmail: row.student_email,
      studentName: row.student_first_name && row.student_last_name
        ? `${row.student_first_name} ${row.student_last_name}`
        : row.student_email,
      canViewProgress: row.can_view_progress,
      canViewAttendance: row.can_view_attendance,
      canViewAchievements: row.can_view_achievements,
      canViewCertificates: row.can_view_certificates,
      canViewActivityLog: row.can_view_activity_log,
      canViewEngagementStats: row.can_view_engagement_stats,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching parent access control settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch access control settings',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/parent-access-control
 * Create or update parent access control settings
 */
export async function PUT(request) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Authentication: Only admin and superadmin
    const session = await requireRole(request, ['admin', 'superadmin']);
    const adminId = session.user.id;
    const orgId = session.user.orgId;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const {
      org_id,
      parent_user_id,
      student_user_id,
      can_view_progress,
      can_view_attendance,
      can_view_achievements,
      can_view_certificates,
      can_view_activity_log,
      can_view_engagement_stats,
    } = body;

    // Validate org_id
    const targetOrgId = org_id || orgId;
    if (!targetOrgId && session.user.role !== 'superadmin') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required',
        },
        { status: 400 }
      );
    }

    // Verify parent_user_id is a parent (if provided)
    if (parent_user_id) {
      const parentCheck = await client.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.code = 'parent' AND ($2::uuid IS NULL OR ur.org_id = $2)
         LIMIT 1`,
        [parent_user_id, targetOrgId]
      );
      if (parentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid parent user ID or parent not in organization',
          },
          { status: 400 }
        );
      }
    }

    // Verify student_user_id is a student (if provided)
    if (student_user_id) {
      const studentCheck = await client.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.code = 'student' AND ($2::uuid IS NULL OR ur.org_id = $2)
         LIMIT 1`,
        [student_user_id, targetOrgId]
      );
      if (studentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid student user ID or student not in organization',
          },
          { status: 400 }
        );
      }
    }

    // Insert or update access settings
    const upsertQuery = `
      INSERT INTO parent_access_settings (
        id, org_id, parent_user_id, student_user_id,
        can_view_progress, can_view_attendance, can_view_achievements,
        can_view_certificates, can_view_activity_log, can_view_engagement_stats,
        created_by, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (org_id, parent_user_id, student_user_id)
      DO UPDATE SET
        can_view_progress = EXCLUDED.can_view_progress,
        can_view_attendance = EXCLUDED.can_view_attendance,
        can_view_achievements = EXCLUDED.can_view_achievements,
        can_view_certificates = EXCLUDED.can_view_certificates,
        can_view_activity_log = EXCLUDED.can_view_activity_log,
        can_view_engagement_stats = EXCLUDED.can_view_engagement_stats,
        created_by = EXCLUDED.created_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await client.query(upsertQuery, [
      targetOrgId,
      parent_user_id || null,
      student_user_id || null,
      can_view_progress !== undefined ? can_view_progress : true,
      can_view_attendance !== undefined ? can_view_attendance : true,
      can_view_achievements !== undefined ? can_view_achievements : true,
      can_view_certificates !== undefined ? can_view_certificates : true,
      can_view_activity_log !== undefined ? can_view_activity_log : true,
      can_view_engagement_stats !== undefined ? can_view_engagement_stats : true,
      adminId,
    ]);

    await client.query('COMMIT');

    const setting = result.rows[0];

    return NextResponse.json({
      success: true,
      setting: {
        id: setting.id,
        orgId: setting.org_id,
        parentUserId: setting.parent_user_id,
        studentUserId: setting.student_user_id,
        canViewProgress: setting.can_view_progress,
        canViewAttendance: setting.can_view_attendance,
        canViewAchievements: setting.can_view_achievements,
        canViewCertificates: setting.can_view_certificates,
        canViewActivityLog: setting.can_view_activity_log,
        canViewEngagementStats: setting.can_view_engagement_stats,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating parent access control settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update access control settings',
      },
      { status: error.status || 500 }
    );
  } finally {
    client.release();
  }
}
