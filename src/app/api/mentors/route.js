/**
 * Mentors API Route
 * 
 * GET /api/mentors - List mentors in admin's organization
 * POST /api/mentors/[id]/assign-students - Assign students to mentor
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors
 * List mentors in admin's organization
 */
export async function GET(request) {
  try {
    console.log('📋 [MENTORS] ===== LIST MENTORS STARTED =====');
    
    // Require admin role
    const session = await requireRole(request, ['admin']);
    const userOrgId = session.user.orgId;

    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: 'You must belong to an organization' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       INNER JOIN user_roles ur ON u.id = ur.user_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE r.code = 'mentor' AND u.org_id = $1 AND u.is_active = true`,
      [userOrgId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get mentors with their student assignments
    const mentorsQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.is_active,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT msa.student_id) as assigned_students_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'email', s.email,
              'first_name', s.first_name,
              'last_name', s.last_name,
              'cohort_id', msa.cohort_id
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) as assigned_students
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN roles r ON ur.role_id = r.id
      LEFT JOIN mentor_student_assignments msa ON u.id = msa.mentor_id
      LEFT JOIN users s ON msa.student_id = s.id
      WHERE r.code = 'mentor' AND u.org_id = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.is_active, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const mentorsResult = await query(mentorsQuery, [userOrgId, limit, offset]);

    const mentors = mentorsResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      is_active: row.is_active,
      assigned_students_count: parseInt(row.assigned_students_count, 10),
      assigned_students: row.assigned_students || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('📋 [MENTORS] ✅ Mentors fetched:', mentors.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          mentors,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📋 [MENTORS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch mentors' 
      },
      { status: 500 }
    );
  }
}

