/**
 * Unassign Students from Mentor API Route
 * 
 * DELETE /api/mentors/[id]/unassign-students
 * Unassign students from a mentor (Admin only, within their organization)
 * 
 * Request body:
 * {
 *   student_ids: string[] (array of student UUIDs to unassign)
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function DELETE(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('👥 [UNASSIGN STUDENTS] ===== UNASSIGN STUDENTS STARTED =====');
    
    const { id: mentorId } = params;
    
    // Check authentication and require admin role
    const session = await requireRole(request, ['admin']);
    const userOrgId = session.user.orgId;

    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: 'You must belong to an organization' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { student_ids } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'student_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    console.log('👥 [UNASSIGN STUDENTS] Transaction started');

    // Verify mentor exists and belongs to admin's organization
    const mentorCheck = await client.query(
      `SELECT u.id, u.org_id
       FROM users u
       INNER JOIN user_roles ur ON u.id = ur.user_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND r.code = 'mentor' AND u.org_id = $2`,
      [mentorId, userOrgId]
    );

    if (mentorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Mentor not found or does not belong to your organization' },
        { status: 404 }
      );
    }

    // Delete assignments
    const deleteResult = await client.query(
      `DELETE FROM mentor_student_assignments 
       WHERE mentor_id = $1 AND student_id = ANY($2::uuid[])
       RETURNING student_id`,
      [mentorId, student_ids]
    );

    await client.query('COMMIT');
    console.log('👥 [UNASSIGN STUDENTS] Transaction committed');

    console.log('👥 [UNASSIGN STUDENTS] ✅ Students unassigned successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          mentor_id: mentorId,
          unassigned_student_ids: deleteResult.rows.map(r => r.student_id),
          count: deleteResult.rows.length
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('👥 [UNASSIGN STUDENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to unassign students' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

