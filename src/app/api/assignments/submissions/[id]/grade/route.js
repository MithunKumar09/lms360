/**
 * Grade Submission API Route
 * 
 * PUT /api/assignments/submissions/:id/grade - Grade a submission
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * PUT /api/assignments/submissions/:id/grade
 * Grade a submission
 */
export async function PUT(request, context) {
  try {
    const params = await context.params;
    const session = await requireRole(request, ['instructor']);
    const userId = session.user.id;
    const submissionId = params.id;

    const body = await request.json();
    const { marksObtained, feedback, status } = body;

    // Verify submission belongs to instructor's assignment
    // Note: Using 'sub' as alias instead of 'as' (which is a SQL reserved keyword)
    const checkQuery = `
      SELECT 
        sub.id,
        sub.assignment_id,
        a.max_marks,
        a.created_by
      FROM assignment_submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      WHERE sub.id = $1 AND a.created_by = $2
    `;
    const checkResult = await query(checkQuery, [submissionId, userId]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found or you do not have permission' },
        { status: 403 }
      );
    }

    const submission = checkResult.rows[0];
    const maxMarks = parseFloat(submission.max_marks);

    // Validation
    if (marksObtained !== null && marksObtained !== undefined) {
      if (marksObtained < 0 || marksObtained > maxMarks) {
        return NextResponse.json(
          { success: false, error: `Marks must be between 0 and ${maxMarks}` },
          { status: 400 }
        );
      }
    }

    if (status && !['submitted', 'graded', 'returned'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (marksObtained !== null && marksObtained !== undefined) {
      updateFields.push(`marks_obtained = $${paramIndex++}`);
      updateValues.push(marksObtained);
    }
    if (feedback !== undefined) {
      updateFields.push(`feedback = $${paramIndex++}`);
      updateValues.push(feedback?.trim() || null);
    }
    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    // If marks are being set, also set graded_by and graded_at
    if (marksObtained !== null && marksObtained !== undefined) {
      updateFields.push(`graded_by = $${paramIndex++}`);
      updateValues.push(userId);
      updateFields.push(`graded_at = CURRENT_TIMESTAMP`);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(submissionId);

    const updateQuery = `
      UPDATE assignment_submissions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const result = await query(updateQuery, updateValues);

    const updatedRow = result.rows[0];

    return NextResponse.json({
      success: true,
      submission: {
        id: updatedRow.id,
        marksObtained: updatedRow.marks_obtained ? parseFloat(updatedRow.marks_obtained) : null,
        feedback: updatedRow.feedback,
        status: updatedRow.status,
        gradedBy: updatedRow.graded_by,
        gradedAt: updatedRow.graded_at,
        updatedAt: updatedRow.updated_at,
      },
      message: 'Submission graded successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Grade Submission PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to grade submission',
      },
      { status: error.status || 500 }
    );
  }
}

