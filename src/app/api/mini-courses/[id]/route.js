/**
 * Mini Course API Route (Single Mini Course)
 * 
 * GET /api/mini-courses/:id - Get mini course details
 * PUT /api/mini-courses/:id - Update mini course
 * DELETE /api/mini-courses/:id - Delete mini course
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * GET /api/mini-courses/:id
 * Get mini course details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const miniCourseId = params.id;

    // Build WHERE conditions based on role
    const whereConditions = ['mc.id = $1'];
    const queryParams = [miniCourseId];
    let paramIndex = 2;

    if (userRole === 'superadmin') {
      // Superadmin: Can see all mini courses
      // No additional filter needed
    } else if (userRole === 'admin') {
      // Admin: Only mini courses from their organization
      if (userOrgId) {
        whereConditions.push(`mc.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        whereConditions.push(`mc.org_id IS NULL AND mc.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.join(' AND ');

    // Get mini course details
    const miniCourseQuery = `
      SELECT 
        mc.id,
        mc.org_id,
        mc.created_by,
        mc.admin_id,
        mc.title,
        mc.description,
        mc.cover_photo_url,
        mc.stamp_logo_url,
        mc.video_url,
        mc.video_file_key,
        mc.instructions,
        mc.material_url,
        mc.material_file_key,
        mc.status,
        mc.created_at,
        mc.updated_at,
        o.name as org_name,
        u.email as created_by_email
      FROM mini_courses mc
      LEFT JOIN organizations o ON mc.org_id = o.id
      LEFT JOIN users u ON mc.created_by = u.id
      WHERE ${whereClause}
    `;

    const result = await query(miniCourseQuery, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mini course not found or you do not have permission',
        },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const miniCourse = {
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      createdBy: row.created_by,
      createdByEmail: row.created_by_email,
      adminId: row.admin_id,
      title: row.title,
      description: row.description,
      coverPhotoUrl: row.cover_photo_url,
      stampLogoUrl: row.stamp_logo_url,
      videoUrl: row.video_url,
      videoFileKey: row.video_file_key,
      instructions: row.instructions,
      materialUrl: row.material_url,
      materialFileKey: row.material_file_key,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      miniCourse,
    });
  } catch (error) {
    console.error('❌ [API] [Mini Course GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch mini course',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/mini-courses/:id
 * Update mini course
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const miniCourseId = params.id;

    const body = await request.json();
    const {
      title,
      description,
      coverPhotoUrl,
      stampLogoUrl,
      videoUrl,
      videoFileKey,
      instructions,
      materialUrl,
      materialFileKey,
      status,
    } = body;

    // First, verify access to this mini course
    const accessCheckQuery = `
      SELECT id, org_id, created_by, admin_id
      FROM mini_courses
      WHERE id = $1
    `;
    const accessResult = await query(accessCheckQuery, [miniCourseId]);

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mini course not found',
        },
        { status: 404 }
      );
    }

    const miniCourse = accessResult.rows[0];

    // Check permissions
    if (userRole === 'admin') {
      if (userOrgId) {
        if (miniCourse.org_id !== userOrgId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to update this mini course',
            },
            { status: 403 }
          );
        }
      } else {
        if (miniCourse.org_id !== null || miniCourse.created_by !== userId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to update this mini course',
            },
            { status: 403 }
          );
        }
      }
    }
    // Superadmin can update any mini course

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (title.trim().length < 3 || title.trim().length > 255) {
        return NextResponse.json(
          { success: false, error: 'Title must be between 3 and 255 characters' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      if (description.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Description cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`description = $${paramIndex}`);
      updateParams.push(description.trim());
      paramIndex++;
    }

    if (coverPhotoUrl !== undefined) {
      if (coverPhotoUrl.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Cover photo URL cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`cover_photo_url = $${paramIndex}`);
      updateParams.push(coverPhotoUrl.trim());
      paramIndex++;
    }

    if (stampLogoUrl !== undefined) {
      if (stampLogoUrl.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Stamp logo URL cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`stamp_logo_url = $${paramIndex}`);
      updateParams.push(stampLogoUrl.trim());
      paramIndex++;
    }

    if (videoUrl !== undefined) {
      updateFields.push(`video_url = $${paramIndex}`);
      updateParams.push(videoUrl?.trim() || null);
      paramIndex++;
    }

    if (videoFileKey !== undefined) {
      updateFields.push(`video_file_key = $${paramIndex}`);
      updateParams.push(videoFileKey?.trim() || null);
      paramIndex++;
    }

    if (instructions !== undefined) {
      if (instructions.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Instructions cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`instructions = $${paramIndex}`);
      updateParams.push(instructions.trim());
      paramIndex++;
    }

    if (materialUrl !== undefined) {
      updateFields.push(`material_url = $${paramIndex}`);
      updateParams.push(materialUrl?.trim() || null);
      paramIndex++;
    }

    if (materialFileKey !== undefined) {
      updateFields.push(`material_file_key = $${paramIndex}`);
      updateParams.push(materialFileKey?.trim() || null);
      paramIndex++;
    }

    if (status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Must be draft, published, or archived' },
          { status: 400 }
        );
      }
      updateFields.push(`status = $${paramIndex}`);
      updateParams.push(status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add mini course ID to params
    updateParams.push(miniCourseId);

    const updateQuery = `
      UPDATE mini_courses
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, org_id, created_by, admin_id, title, description, cover_photo_url, 
                stamp_logo_url, video_url, video_file_key, instructions, material_url, 
                material_file_key, status, created_at, updated_at
    `;

    const result = await query(updateQuery, updateParams);

    const updatedRow = result.rows[0];
    const updatedMiniCourse = {
      id: updatedRow.id,
      orgId: updatedRow.org_id,
      createdBy: updatedRow.created_by,
      adminId: updatedRow.admin_id,
      title: updatedRow.title,
      description: updatedRow.description,
      coverPhotoUrl: updatedRow.cover_photo_url,
      stampLogoUrl: updatedRow.stamp_logo_url,
      videoUrl: updatedRow.video_url,
      videoFileKey: updatedRow.video_file_key,
      instructions: updatedRow.instructions,
      materialUrl: updatedRow.material_url,
      materialFileKey: updatedRow.material_file_key,
      status: updatedRow.status,
      createdAt: updatedRow.created_at,
      updatedAt: updatedRow.updated_at,
    };

    return NextResponse.json({
      success: true,
      miniCourse: updatedMiniCourse,
      message: 'Mini course updated successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Mini Course PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update mini course',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/mini-courses/:id
 * Delete mini course
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const miniCourseId = params.id;

    // First, verify access to this mini course
    const accessCheckQuery = `
      SELECT id, org_id, created_by, admin_id
      FROM mini_courses
      WHERE id = $1
    `;
    const accessResult = await query(accessCheckQuery, [miniCourseId]);

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mini course not found',
        },
        { status: 404 }
      );
    }

    const miniCourse = accessResult.rows[0];

    // Check permissions
    if (userRole === 'admin') {
      if (userOrgId) {
        if (miniCourse.org_id !== userOrgId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to delete this mini course',
            },
            { status: 403 }
          );
        }
      } else {
        if (miniCourse.org_id !== null || miniCourse.created_by !== userId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to delete this mini course',
            },
            { status: 403 }
          );
        }
      }
    }
    // Superadmin can delete any mini course

    // Check for associated quizzes
    const quizzesCheckQuery = `
      SELECT COUNT(*) as count
      FROM quizzes
      WHERE mini_course_id = $1
    `;
    const quizzesResult = await query(quizzesCheckQuery, [miniCourseId]);
    const quizCount = parseInt(quizzesResult.rows[0].count, 10);

    if (quizCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete mini course. It is associated with ${quizCount} quiz(es). Please delete or unlink the quizzes first.`,
        },
        { status: 400 }
      );
    }

    // Delete mini course
    const deleteQuery = `
      DELETE FROM mini_courses
      WHERE id = $1
      RETURNING id
    `;
    const deleteResult = await query(deleteQuery, [miniCourseId]);

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete mini course',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mini course deleted successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Mini Course DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete mini course',
      },
      { status: error.status || 500 }
    );
  }
}

