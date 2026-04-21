/**
 * Assignment API Route (Single Assignment)
 * 
 * GET /api/assignments/:id - Get assignment details
 * PUT /api/assignments/:id - Update assignment
 * DELETE /api/assignments/:id - Delete assignment
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/assignments/:id
 * Get assignment details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['instructor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assignment ID is required',
        },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    const assignmentId = params.id;

    // Get assignment with course info
    const assignmentQuery = `
      SELECT 
        a.id,
        a.course_id,
        a.created_by,
        a.title,
        a.description,
        a.instructions,
        a.max_marks,
        a.passing_marks,
        a.due_date,
        a.allow_late_submission,
        a.late_submission_penalty,
        a.max_file_size_mb,
        a.allowed_file_types,
        a.status,
        a.created_at,
        a.updated_at,
        c.title as course_title,
        c.slug as course_slug
      FROM assignments a
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1 AND a.created_by = $2
    `;
    const result = await query(assignmentQuery, [assignmentId, userId]);

    if (!Array.isArray(result?.rows) || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    if (!row || typeof row !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment data' },
        { status: 500 }
      );
    }
    
    // Get attachments
    const attachmentsQuery = `
      SELECT 
        id,
        file_key,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        created_at
      FROM assignment_attachments
      WHERE assignment_id = $1
      ORDER BY created_at ASC
    `;
    const attachmentsResult = await query(attachmentsQuery, [assignmentId]);
    
    const attachments = Array.isArray(attachmentsResult?.rows)
      ? attachmentsResult.rows
          .filter(att => att && typeof att === 'object')
          .map(att => ({
            id: att.id,
            fileKey: att.file_key,
            fileUrl: att.file_url,
            fileName: att.file_name,
            fileType: att.file_type,
            fileSizeBytes: att.file_size_bytes,
            createdAt: att.created_at,
          }))
      : [];
    
    const assignment = {
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      courseSlug: row.course_slug,
      createdBy: row.created_by,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      maxMarks: parseFloat(row.max_marks),
      passingMarks: parseFloat(row.passing_marks),
      dueDate: row.due_date,
      allowLateSubmission: row.allow_late_submission,
      lateSubmissionPenalty: parseFloat(row.late_submission_penalty || 0),
      maxFileSizeMb: row.max_file_size_mb,
      allowedFileTypes: row.allowed_file_types || [],
      status: row.status,
      attachments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error('❌ [API] [Assignment GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignment',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/assignments/:id
 * Update assignment
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['instructor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assignment ID is required',
        },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    const assignmentId = params.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const {
      title,
      description,
      instructions,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxFileSizeMb,
      allowedFileTypes,
      status,
      attachments,
    } = body;

    // Verify assignment belongs to instructor
    const checkQuery = `
      SELECT id, status
      FROM assignments
      WHERE id = $1 AND created_by = $2
    `;
    const checkResult = await query(checkQuery, [assignmentId, userId]);
    if (!Array.isArray(checkResult?.rows) || checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or you do not have permission' },
        { status: 403 }
      );
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || title.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'Title must be at least 3 characters' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title.trim());
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description?.trim() || null);
    }
    if (instructions !== undefined) {
      updateFields.push(`instructions = $${paramIndex++}`);
      updateValues.push(instructions?.trim() || null);
    }
    if (maxMarks !== undefined) {
      if (maxMarks <= 0) {
        return NextResponse.json(
          { success: false, error: 'Max marks must be greater than 0' },
          { status: 400 }
        );
      }
      updateFields.push(`max_marks = $${paramIndex++}`);
      updateValues.push(maxMarks);
    }
    if (passingMarks !== undefined) {
      const currentMaxMarks = maxMarks !== undefined 
        ? maxMarks 
        : (checkResult.rows[0]?.max_marks || 0);
      if (passingMarks < 0 || passingMarks > currentMaxMarks) {
        return NextResponse.json(
          { success: false, error: 'Passing marks must be between 0 and max marks' },
          { status: 400 }
        );
      }
      updateFields.push(`passing_marks = $${paramIndex++}`);
      updateValues.push(passingMarks);
    }
    if (dueDate !== undefined) {
      updateFields.push(`due_date = $${paramIndex++}`);
      updateValues.push(dueDate);
    }
    if (allowLateSubmission !== undefined) {
      updateFields.push(`allow_late_submission = $${paramIndex++}`);
      updateValues.push(allowLateSubmission);
    }
    if (lateSubmissionPenalty !== undefined) {
      if (lateSubmissionPenalty < 0 || lateSubmissionPenalty > 100) {
        return NextResponse.json(
          { success: false, error: 'Late submission penalty must be between 0 and 100' },
          { status: 400 }
        );
      }
      updateFields.push(`late_submission_penalty = $${paramIndex++}`);
      updateValues.push(lateSubmissionPenalty);
    }
    if (maxFileSizeMb !== undefined) {
      updateFields.push(`max_file_size_mb = $${paramIndex++}`);
      updateValues.push(maxFileSizeMb);
    }
    if (allowedFileTypes !== undefined) {
      updateFields.push(`allowed_file_types = $${paramIndex++}`);
      updateValues.push(allowedFileTypes.length > 0 ? allowedFileTypes : null);
    }
    if (status !== undefined) {
      if (!['draft', 'published', 'closed'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause params
    updateValues.push(assignmentId, userId);

    const updateQuery = `
      UPDATE assignments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND created_by = $${paramIndex}
      RETURNING *
    `;
    const result = await query(updateQuery, updateValues);

    // Handle attachments if provided
    if (attachments !== undefined) {
      // Delete existing attachments
      await query('DELETE FROM assignment_attachments WHERE assignment_id = $1', [assignmentId]);
      
      // Insert new attachments
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const attachment of attachments) {
          const attachmentQuery = `
            INSERT INTO assignment_attachments (
              assignment_id,
              file_key,
              file_url,
              file_name,
              file_type,
              file_size_bytes
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `;
          await query(attachmentQuery, [
            assignmentId,
            attachment.fileKey,
            attachment.fileUrl,
            attachment.fileName,
            attachment.fileType,
            attachment.fileSizeBytes,
          ]);
        }
      }
    }

    // Get updated assignment with attachments (always fetch to include in response)
    const getAttachmentsQuery = `
      SELECT 
        id,
        file_key,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        created_at
      FROM assignment_attachments
      WHERE assignment_id = $1
      ORDER BY created_at ASC
    `;
    const attachmentsResult = await query(getAttachmentsQuery, [assignmentId]);
    const assignmentAttachments = Array.isArray(attachmentsResult?.rows)
      ? attachmentsResult.rows
          .filter(att => att && typeof att === 'object')
          .map(att => ({
            id: att.id,
            fileKey: att.file_key,
            fileUrl: att.file_url,
            fileName: att.file_name,
            fileType: att.file_type,
            fileSizeBytes: att.file_size_bytes,
            createdAt: att.created_at,
          }))
      : [];

    if (!Array.isArray(result?.rows) || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }
    
    const row = result.rows[0];
    if (!row || typeof row !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment data' },
        { status: 500 }
      );
    }
    const assignment = {
      id: row.id,
      courseId: row.course_id,
      createdBy: row.created_by,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      maxMarks: parseFloat(row.max_marks),
      passingMarks: parseFloat(row.passing_marks),
      dueDate: row.due_date,
      allowLateSubmission: row.allow_late_submission,
      lateSubmissionPenalty: parseFloat(row.late_submission_penalty || 0),
      maxFileSizeMb: row.max_file_size_mb,
      allowedFileTypes: row.allowed_file_types || [],
      status: row.status,
      attachments: assignmentAttachments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      assignment,
      message: 'Assignment updated successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Assignment PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update assignment',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/assignments/:id
 * Delete assignment
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['instructor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assignment ID is required',
        },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    const assignmentId = params.id;

    // Verify assignment belongs to instructor
    const checkQuery = `
      SELECT id
      FROM assignments
      WHERE id = $1 AND created_by = $2
    `;
    const checkResult = await query(checkQuery, [assignmentId, userId]);
    if (!Array.isArray(checkResult?.rows) || checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or you do not have permission' },
        { status: 403 }
      );
    }

    // Delete assignment (CASCADE will handle related records)
    const deleteQuery = `
      DELETE FROM assignments
      WHERE id = $1 AND created_by = $2
      RETURNING id
    `;
    const result = await query(deleteQuery, [assignmentId, userId]);

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Assignment DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete assignment',
      },
      { status: error.status || 500 }
    );
  }
}

