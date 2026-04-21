/**
 * Assignment Submission Edit API Route
 * 
 * GET /api/assignments/:id/submission/edit - Get submission data for editing
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student']);
    const userId = session.user.id;
    const assignmentId = params.id;

    // Verify student has access to assignment
    const accessQuery = `
      SELECT DISTINCT a.id
      FROM assignments a
      INNER JOIN courses c ON a.course_id = c.id
      INNER JOIN course_assignments ca ON ca.course_id = c.id
      INNER JOIN user_class_subject_links ucsl ON (
        (ca.cohort_id IS NOT NULL AND ucsl.cohort_id = ca.cohort_id) OR
        (ca.subject_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM subject_offerings so
          WHERE so.subject_id = ca.subject_id
          AND so.id = ucsl.subject_offering_id
          AND so.cohort_id = ucsl.cohort_id
        ))
      )
      WHERE a.id = $1
        AND ucsl.user_id = $2
        AND ucsl.link_type = 'student'
        AND ca.is_active = true
        AND a.status = 'published'
    `;
    const accessResult = await query(accessQuery, [assignmentId, userId]);

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or you do not have access' },
        { status: 404 }
      );
    }

    // Get assignment constraints
    const assignmentQuery = `
      SELECT 
        id,
        title,
        due_date,
        allow_late_submission,
        max_file_size_mb,
        allowed_file_types
      FROM assignments
      WHERE id = $1
    `;
    const assignmentResult = await query(assignmentQuery, [assignmentId]);

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignmentRow = assignmentResult.rows[0];

    // Get existing submission
    const submissionQuery = `
      SELECT 
        id,
        assignment_id,
        student_id,
        submitted_at,
        is_late,
        status
      FROM assignment_submissions
      WHERE assignment_id = $1 AND student_id = $2
    `;
    const submissionResult = await query(submissionQuery, [assignmentId, userId]);

    if (submissionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    const subRow = submissionResult.rows[0];

    // Get submission files
    const filesQuery = `
      SELECT 
        id,
        file_key,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        created_at
      FROM assignment_submission_files
      WHERE submission_id = $1
      ORDER BY created_at ASC
    `;
    const filesResult = await query(filesQuery, [subRow.id]);

    const submission = {
      id: subRow.id,
      assignmentId: subRow.assignment_id,
      submittedAt: subRow.submitted_at,
      isLate: subRow.is_late,
      status: subRow.status,
      files: filesResult.rows.map(file => ({
        id: file.id,
        fileName: file.file_name,
        fileUrl: file.file_url,
        fileType: file.file_type,
        fileSizeBytes: file.file_size_bytes,
        createdAt: file.created_at,
      })),
    };

    const assignment = {
      id: assignmentRow.id,
      title: assignmentRow.title,
      maxFileSizeMb: assignmentRow.max_file_size_mb,
      allowedFileTypes: assignmentRow.allowed_file_types || [],
      deadline: assignmentRow.due_date,
      allowLateSubmission: assignmentRow.allow_late_submission,
    };

    return NextResponse.json({
      success: true,
      submission,
      assignment,
    });
  } catch (error) {
    console.error('❌ [API] [Submission Edit GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch submission',
      },
      { status: error.status || 500 }
    );
  }
}

