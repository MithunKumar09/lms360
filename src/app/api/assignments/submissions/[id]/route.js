/**
 * Assignment Submission API Route (Single Submission)
 * 
 * GET /api/assignments/submissions/:id - Get submission details with files
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/assignments/submissions/:id
 * Get submission details with files
 * Supports both instructor and student roles
 */
export async function GET(request, context) {
  try {
    const params = await context.params;
    const session = await requireRole(request, ['instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const submissionId = params.id;

    // Build WHERE clause based on user role
    let whereClause;
    let queryParams;
    
    if (userRole === 'instructor') {
      // Instructor can only see submissions for assignments they created
      whereClause = 'sub.id = $1 AND a.created_by = $2';
      queryParams = [submissionId, userId];
    } else if (userRole === 'student') {
      // Student can only see their own submissions
      whereClause = 'sub.id = $1 AND sub.student_id = $2';
      queryParams = [submissionId, userId];
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get submission with assignment and student info
    // Note: Using 'sub' as alias instead of 'as' (which is a SQL reserved keyword)
    const submissionQuery = `
      SELECT 
        sub.id,
        sub.assignment_id,
        sub.student_id,
        sub.submitted_at,
        sub.is_late,
        sub.marks_obtained,
        sub.feedback,
        sub.graded_by,
        sub.graded_at,
        sub.status,
        sub.created_at,
        sub.updated_at,
        a.title AS assignment_title,
        a.max_marks,
        a.passing_marks,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM assignment_submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      JOIN users u ON sub.student_id = u.id
      WHERE ${whereClause}
    `;
    const submissionResult = await query(submissionQuery, queryParams);

    if (submissionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    const row = submissionResult.rows[0];
    const submission = {
      id: row.id,
      assignmentId: row.assignment_id,
      assignmentTitle: row.assignment_title,
      maxMarks: parseFloat(row.max_marks),
      passingMarks: parseFloat(row.passing_marks),
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      studentEmail: row.email,
      studentAvatar: row.avatar_url,
      submittedAt: row.submitted_at,
      isLate: row.is_late,
      marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
      feedback: row.feedback,
      gradedBy: row.graded_by,
      gradedAt: row.graded_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Get submission files
    const filesQuery = `
      SELECT 
        id,
        file_key,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        description,
        created_at
      FROM assignment_submission_files
      WHERE submission_id = $1
      ORDER BY created_at ASC
    `;
    const filesResult = await query(filesQuery, [submissionId]);

    submission.files = filesResult.rows.map(fileRow => ({
      id: fileRow.id,
      fileKey: fileRow.file_key,
      fileUrl: fileRow.file_url,
      fileName: fileRow.file_name,
      fileType: fileRow.file_type,
      fileSizeBytes: fileRow.file_size_bytes,
      description: fileRow.description || null, // Include description field
      createdAt: fileRow.created_at,
    }));

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('❌ [API] [Submission GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch submission',
      },
      { status: error.status || 500 }
    );
  }
}

