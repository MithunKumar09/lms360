/**
 * Course Pin API Route
 * 
 * Handles course pin/unpin operations for prioritization.
 * 
 * PATCH /api/courses/:id/pin - Pin or unpin a course
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getCoursePermissions } from '@/lib/course/permissions.js';

/**
 * PATCH /api/courses/:id/pin
 * Pin or unpin a course
 * 
 * Body:
 * - pinned: boolean (true to pin, false to unpin)
 */
export async function PATCH(request, { params }) {
  console.log('📌 [PIN COURSE API] ===== REQUEST STARTED =====');
  try {
    // Authentication: superadmin, admin, or instructor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;
    const courseId = params.id;

    console.log('📌 [PIN COURSE API] User:', {
      userId,
      userRole,
      userOrgId,
      courseId,
    });

    const body = await request.json();
    // Support both 'pinned' and 'isPinned' for compatibility
    const pinned = body.pinned !== undefined ? body.pinned : body.isPinned;

    // Validate pinned value
    if (typeof pinned !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request. "pinned" or "isPinned" must be a boolean value.',
        },
        { status: 400 }
      );
    }

    console.log('📌 [PIN COURSE API] Pin request:', {
      pinned,
      body,
    });

    // Check if course exists and get creator info for permission check
    const courseResult = await query(
      `SELECT c.id, c.title, c.org_id, c.created_by, u.role as creator_role
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      console.log('📌 [PIN COURSE API] Course not found');
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];
    console.log('📌 [PIN COURSE API] Course found:', {
      id: course.id,
      title: course.title,
      org_id: course.org_id,
      created_by: course.created_by,
      creator_role: course.creator_role,
    });

    // Check permissions using the permissions utility
    const user = {
      id: userId,
      role: userRole,
      orgId: userOrgId,
    };
    const permissions = getCoursePermissions(course, user);

    if (!permissions.canPin) {
      console.log('📌 [PIN COURSE API] Permission denied');
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to pin/unpin this course',
        },
        { status: 403 }
      );
    }

    // Update pinned status
    // First, try to add the column if it doesn't exist (for backward compatibility)
    try {
      await query(
        `ALTER TABLE courses ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false`,
        []
      );
      console.log('📌 [PIN COURSE API] Ensured pinned column exists');
    } catch (alterError) {
      // Column might already exist, or there's a permission issue
      // Continue anyway - the UPDATE will fail if column doesn't exist
      console.warn('📌 [PIN COURSE API] Could not ensure pinned column exists:', alterError.message);
    }

    // Update pinned status
    const updateResult = await query(
      `UPDATE courses 
       SET pinned = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, title, pinned`,
      [pinned, courseId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update course pin status',
        },
        { status: 500 }
      );
    }

    const updatedCourse = updateResult.rows[0];
    console.log('📌 [PIN COURSE API] Course pin status updated:', {
      id: updatedCourse.id,
      pinned: updatedCourse.pinned,
    });
    console.log('📌 [PIN COURSE API] ===== REQUEST SUCCESSFUL =====');

    return NextResponse.json({
      success: true,
      message: pinned ? 'Course pinned successfully' : 'Course unpinned successfully',
      course: {
        id: updatedCourse.id,
        title: updatedCourse.title,
        pinned: updatedCourse.pinned,
      },
    });
  } catch (error) {
    console.error('📌 [PIN COURSE API] ===== ERROR =====');
    console.error('📌 [PIN COURSE API] Error pinning/unpinning course:', error);
    console.error('📌 [PIN COURSE API] Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update course pin status',
      },
      { status: error.status || 500 }
    );
  }
}

