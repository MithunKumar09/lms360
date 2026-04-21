/**
 * Mentor Material Detail API Route
 * 
 * GET /api/mentors/materials/:id - Get material details
 * PUT /api/mentors/materials/:id - Update material
 * DELETE /api/mentors/materials/:id - Delete material
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { getR2Client, getR2BucketName, buildR2Key } from '@/lib/r2/config.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * GET /api/mentors/materials/:id
 * Get material details
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const materialQuery = `
      SELECT 
        mm.*,
        c.code as cohort_code,
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name
      FROM mentor_materials mm
      LEFT JOIN cohorts c ON mm.cohort_id = c.id
      LEFT JOIN users u ON mm.student_id = u.id
      WHERE mm.id = $1 AND mm.mentor_id = $2
    `;
    const materialResult = await query(materialQuery, [id, mentorId]);

    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    const material = materialResult.rows[0];
    const materialResponse = {
      id: material.id,
      mentorId: material.mentor_id,
      cohortId: material.cohort_id,
      studentId: material.student_id,
      title: material.title,
      description: material.description,
      category: material.category,
      fileKey: material.file_key,
      fileUrl: material.file_url,
      externalUrl: material.external_url,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
      cohort: material.cohort_code ? { code: material.cohort_code } : null,
      student: material.student_user_id ? {
        id: material.student_user_id,
        firstName: material.student_first_name,
        lastName: material.student_last_name,
      } : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          material: materialResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📚 [MENTOR MATERIAL] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch material' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentors/materials/:id
 * Update material
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const {
      title,
      description,
      category,
      external_url,
    } = body;

    // Verify material exists
    const checkQuery = `
      SELECT id FROM mentor_materials WHERE id = $1 AND mentor_id = $2
    `;
    const checkResult = await query(checkQuery, [id, mentorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'title cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    if (category !== undefined) {
      if (category) {
        const validCategories = ['document', 'video', 'link', 'other'];
        if (!validCategories.includes(category)) {
          return NextResponse.json(
            { success: false, error: `category must be one of: ${validCategories.join(', ')}` },
            { status: 400 }
          );
        }
      }
      updateFields.push(`category = $${paramIndex}`);
      updateValues.push(category || null);
      paramIndex++;
    }

    if (external_url !== undefined) {
      updateFields.push(`external_url = $${paramIndex}`);
      updateValues.push(external_url || null);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update material
    updateValues.push(id);
    const updateQuery = `
      UPDATE mentor_materials
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND mentor_id = $${paramIndex + 1}
      RETURNING *
    `;
    updateValues.push(mentorId);
    const updateResult = await query(updateQuery, updateValues);

    const material = updateResult.rows[0];
    const materialResponse = {
      id: material.id,
      mentorId: material.mentor_id,
      cohortId: material.cohort_id,
      studentId: material.student_id,
      title: material.title,
      description: material.description,
      category: material.category,
      fileKey: material.file_key,
      fileUrl: material.file_url,
      externalUrl: material.external_url,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          material: materialResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📚 [MENTOR MATERIAL] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update material' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentors/materials/:id
 * Delete material
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get material to check file
    const materialQuery = `
      SELECT id, file_key FROM mentor_materials WHERE id = $1 AND mentor_id = $2
    `;
    const materialResult = await query(materialQuery, [id, mentorId]);

    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Material not found or access denied' },
        { status: 404 }
      );
    }

    const material = materialResult.rows[0];

    // Delete file from R2 if exists
    if (material.file_key) {
      try {
        const r2Client = getR2Client();
        const bucket = getR2BucketName();
        const fullKey = buildR2Key(material.file_key);

        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucket,
          Key: fullKey,
        });

        await r2Client.send(deleteCommand);
      } catch (r2Error) {
        console.error('Failed to delete file from R2:', r2Error);
        // Continue with DB deletion
      }
    }

    // Delete material
    await query('DELETE FROM mentor_materials WHERE id = $1', [id]);

    return NextResponse.json(
      {
        success: true,
        message: 'Material deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📚 [MENTOR MATERIAL] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete material' 
      },
      { status: 500 }
    );
  }
}
