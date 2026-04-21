/**
 * Course Status Update API Route
 * 
 * Handles course status updates (active/inactive).
 * 
 * PATCH /api/courses/:id/status - Update course status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * PATCH /api/courses/:id/status
 * Update course status
 * 
 * Body:
 * - status: 'active' | 'inactive' (mapped to 'published' | 'draft' in database)
 */
export async function PATCH(request, { params }) {
  try {
    // Authentication: superadmin, admin, or instructor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;
    const courseId = params.id;

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Must be "active" or "inactive"',
        },
        { status: 400 }
      );
    }

    // Map frontend status to database status
    // 'active' -> 'published', 'inactive' -> 'draft'
    const dbStatus = status === 'active' ? 'published' : 'draft';

    // Check if course exists and get creator info for permission check
    const courseResult = await query(
      `SELECT c.id, c.org_id, c.created_by, c.status,
       u.role as creator_role
       FROM courses c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // Permission check based on role
    if (userRole === 'admin') {
      // Admin cannot modify superadmin-created courses
      if (course.creator_role === 'superadmin') {
        return NextResponse.json(
          {
            success: false,
            error: 'You cannot modify courses created by superadmin',
          },
          { status: 403 }
        );
      }
      // Admin can only modify courses in their organization
      if (course.org_id !== userOrgId) {
        return NextResponse.json(
          {
            success: false,
            error: 'You can only modify courses in your own organization',
          },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      // Instructor cannot modify admin or superadmin-created courses
      if (course.creator_role === 'admin' || course.creator_role === 'superadmin') {
        return NextResponse.json(
          {
            success: false,
            error: 'You cannot modify courses created by admin or superadmin',
          },
          { status: 403 }
        );
      }
      // Instructor can only modify courses in their organization
      if (course.org_id !== userOrgId) {
        return NextResponse.json(
          {
            success: false,
            error: 'You can only modify courses in your own organization',
          },
          { status: 403 }
        );
      }
      // Instructor can only modify their own courses
      if (course.created_by !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'You can only modify your own courses',
          },
          { status: 403 }
        );
      }
    }
    // Superadmin can modify all courses (no restrictions)

    // Update course status
    const updateResult = await query(
      `UPDATE courses 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, title, status`,
      [dbStatus, courseId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update course status',
        },
        { status: 500 }
      );
    }

    const updatedCourse = updateResult.rows[0];

    // Map database status back to frontend status
    const frontendStatus = updatedCourse.status === 'published' ? 'active' : 'inactive';

    return NextResponse.json({
      success: true,
      message: 'Course status updated successfully',
      course: {
        id: updatedCourse.id,
        title: updatedCourse.title,
        status: frontendStatus,
      },
    });
  } catch (error) {
    console.error('Error updating course status:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update course status',
      },
      { status: error.status || 500 }
    );
  }
}

