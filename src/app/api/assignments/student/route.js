/**
 * Student Assignments API Route
 * 
 * GET /api/assignments/student - List assignments available to student
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - courseId: Filter by course ID (optional)
 * - status: Filter by submission status - 'all' | 'not_submitted' | 'submitted' | 'graded' (optional)
 * - sortBy: 'deadline' | 'submitted_at' | 'title' (default: 'deadline')
 * - sortOrder: 'asc' | 'desc' (default: 'asc')
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request) {
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
    
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const courseId = searchParams.get('courseId') || null;
    const status = searchParams.get('status') || null;
    const sortBy = searchParams.get('sortBy') || 'deadline';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Validate sortBy
    const validSortBy = ['deadline', 'submitted_at', 'title'];
    const validSortOrder = ['asc', 'desc'];
    const finalSortBy = validSortBy.includes(sortBy) ? sortBy : 'deadline';
    const finalSortOrder = validSortOrder.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Build WHERE conditions for base query
    const whereConditions = [
      'ucsl.user_id = $1',
      'ucsl.link_type = \'student\'',
      'ca.is_active = true',
      'a.status = \'published\''
    ];
    const queryParams = [userId];
    let paramIndex = 2;

    // Filter by course
    if (courseId) {
      whereConditions.push(`a.course_id = $${paramIndex}`);
      queryParams.push(courseId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    let orderByClause = '';
    if (finalSortBy === 'deadline') {
      orderByClause = `ORDER BY a.due_date ${finalSortOrder}`;
    } else if (finalSortBy === 'submitted_at') {
      orderByClause = `ORDER BY sub.submitted_at ${finalSortOrder} NULLS LAST, a.due_date ASC`;
    } else if (finalSortBy === 'title') {
      orderByClause = `ORDER BY a.title ${finalSortOrder}`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
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
      LEFT JOIN assignment_submissions sub ON (
        sub.assignment_id = a.id AND sub.student_id = $1
      )
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(
      (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
      10
    );

    // Get assignments with submission status
    const assignmentsQuery = `
      SELECT DISTINCT
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
        c.slug as course_slug,
        -- Submission data
        sub.id as submission_id,
        sub.submitted_at,
        sub.is_late,
        sub.marks_obtained,
        sub.feedback,
        sub.status as submission_status,
        -- Count submission files
        (SELECT COUNT(*) FROM assignment_submission_files WHERE submission_id = sub.id) as file_count,
        -- Count assignment attachments
        (SELECT COUNT(*) FROM assignment_attachments WHERE assignment_id = a.id) as attachment_count
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
      LEFT JOIN assignment_submissions sub ON (
        sub.assignment_id = a.id AND sub.student_id = $1
      )
      WHERE ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const assignmentsResult = await query(assignmentsQuery, queryParams);

    // Filter by submission status if specified
    let assignments = Array.isArray(assignmentsResult?.rows)
      ? assignmentsResult.rows
          .filter(row => row && typeof row === 'object')
          .map(row => ({
      id: row.id,
      title: row.title,
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      maxMarks: parseFloat(row.max_marks),
      passingMarks: parseFloat(row.passing_marks),
      deadline: row.due_date,
      allowLateSubmission: row.allow_late_submission,
      lateSubmissionPenalty: parseFloat(row.late_submission_penalty || 0),
      maxFileSizeMb: row.max_file_size_mb,
      allowedFileTypes: row.allowed_file_types || [],
      status: row.status,
      createdAt: row.created_at,
      submission: row.submission_id ? {
        id: row.submission_id,
        submittedAt: row.submitted_at,
        isLate: row.is_late,
        marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
        feedback: row.feedback,
        status: row.submission_status,
        fileCount: parseInt(row.file_count || 0, 10)
      } : null,
      assignmentAttachments: [], // Will be populated if needed
    }))
      : [];

    // Apply status filter if specified
    if (status && status !== 'all') {
      assignments = assignments.filter(assignment => {
        if (status === 'not_submitted') {
          return !assignment.submission;
        } else if (status === 'submitted') {
          return assignment.submission && assignment.submission.status === 'submitted';
        } else if (status === 'graded') {
          return assignment.submission && assignment.submission.status === 'graded';
        }
        return true;
      });
    }

    // Get assignment attachments for each assignment
    if (assignments.length > 0) {
      const assignmentIds = assignments.map(a => a.id);
      const attachmentsQuery = `
        SELECT 
          assignment_id,
          id,
          file_name,
          file_url,
          file_type
        FROM assignment_attachments
        WHERE assignment_id = ANY($1::uuid[])
        ORDER BY created_at ASC
      `;
      const attachmentsResult = await query(attachmentsQuery, [assignmentIds]);
      
      // Group attachments by assignment_id
      const attachmentsMap = {};
      if (Array.isArray(attachmentsResult?.rows)) {
        attachmentsResult.rows.forEach(att => {
          if (!att || typeof att !== 'object') return;
        if (!attachmentsMap[att.assignment_id]) {
          attachmentsMap[att.assignment_id] = [];
        }
        attachmentsMap[att.assignment_id].push({
          id: att.id,
          fileName: att.file_name,
          fileUrl: att.file_url,
          fileType: att.file_type
        });
        });
      }

      // Add attachments to assignments
      assignments = assignments.map(assignment => ({
        ...assignment,
        assignmentAttachments: attachmentsMap[assignment.id] || []
      }));
    }

    return NextResponse.json({
      success: true,
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Student Assignments GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignments',
      },
      { status: error.status || 500 }
    );
  }
}

