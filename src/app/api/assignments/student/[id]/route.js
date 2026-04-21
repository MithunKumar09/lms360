/**
 * Student Assignment Details API Route
 * 
 * GET /api/assignments/student/:id - Get assignment details with submission info
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student']);
    
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

    // Verify student has access to this assignment
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

    if (!Array.isArray(accessResult?.rows) || accessResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or you do not have access' },
        { status: 404 }
      );
    }

    // Get assignment details
    const assignmentQuery = `
      SELECT 
        a.id,
        a.course_id,
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
        c.title as course_name,
        c.slug as course_slug
      FROM assignments a
      INNER JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1
    `;
    const assignmentResult = await query(assignmentQuery, [assignmentId]);

    if (!Array.isArray(assignmentResult?.rows) || assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignmentRow = assignmentResult.rows[0];
    if (!assignmentRow || typeof assignmentRow !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment data' },
        { status: 500 }
      );
    }

    // Get assignment attachments
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

    const assignmentAttachments = Array.isArray(attachmentsResult?.rows)
      ? attachmentsResult.rows
          .filter(att => att && typeof att === 'object')
          .map(att => ({
      id: att.id,
      fileName: att.file_name,
      fileUrl: att.file_url,
      fileType: att.file_type,
      fileSizeBytes: att.file_size_bytes,
      createdAt: att.created_at,
    }))
      : [];

    // Get submission if exists
    const submissionQuery = `
      SELECT 
        id,
        assignment_id,
        student_id,
        submitted_at,
        is_late,
        marks_obtained,
        feedback,
        graded_by,
        graded_at,
        status
      FROM assignment_submissions
      WHERE assignment_id = $1 AND student_id = $2
    `;
    const submissionResult = await query(submissionQuery, [assignmentId, userId]);

    let submission = null;
    if (Array.isArray(submissionResult?.rows) && submissionResult.rows.length > 0) {
      const subRow = submissionResult.rows[0];
      if (!subRow || typeof subRow !== 'object') {
        submission = null;
      } else {

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
      const filesResult = await query(filesQuery, [subRow.id]);

      submission = {
        id: subRow.id,
        submittedAt: subRow.submitted_at,
        isLate: subRow.is_late,
        marksObtained: subRow.marks_obtained ? parseFloat(subRow.marks_obtained) : null,
        feedback: subRow.feedback,
        gradedBy: subRow.graded_by,
        gradedAt: subRow.graded_at,
        status: subRow.status,
        files: Array.isArray(filesResult?.rows)
          ? filesResult.rows
              .filter(file => file && typeof file === 'object')
              .map(file => ({
          id: file.id,
          fileName: file.file_name,
          fileUrl: file.file_url,
          fileType: file.file_type,
          fileSizeBytes: file.file_size_bytes,
          description: file.description || null, // Include description field
          createdAt: file.created_at,
        }))
          : [],
      };
      }
    }

    const assignment = {
      id: assignmentRow.id,
      title: assignmentRow.title,
      description: assignmentRow.description,
      instructions: assignmentRow.instructions,
      courseId: assignmentRow.course_id,
      courseName: assignmentRow.course_name,
      maxMarks: parseFloat(assignmentRow.max_marks),
      passingMarks: parseFloat(assignmentRow.passing_marks),
      deadline: assignmentRow.due_date,
      allowLateSubmission: assignmentRow.allow_late_submission,
      lateSubmissionPenalty: parseFloat(assignmentRow.late_submission_penalty || 0),
      maxFileSizeMb: assignmentRow.max_file_size_mb,
      allowedFileTypes: assignmentRow.allowed_file_types || [],
      status: assignmentRow.status,
      createdAt: assignmentRow.created_at,
      assignmentAttachments,
      submission,
    };

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error('❌ [API] [Student Assignment Details GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignment',
      },
      { status: error.status || 500 }
    );
  }
}

