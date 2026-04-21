/**
 * Assignment Submissions API Route
 * 
 * GET /api/assignments/:id/submissions - List submissions for an assignment
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/assignments/:id/submissions
 * List submissions for an assignment (instructor only)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['instructor']);
    const userId = session.user.id;
    const assignmentId = params.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const status = searchParams.get('status') || null;

    // Verify assignment belongs to instructor
    const assignmentCheck = await query(
      `SELECT id, title, max_marks FROM assignments WHERE id = $1 AND created_by = $2`,
      [assignmentId, userId]
    );
    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or you do not have permission' },
        { status: 403 }
      );
    }

    const assignment = assignmentCheck.rows[0];

    // Build WHERE conditions
    const whereConditions = ['sub.assignment_id = $1'];
    const queryParams = [assignmentId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`sub.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM assignment_submissions sub
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get submissions with student info
    const submissionsQuery = `
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
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM assignment_submissions sub
      JOIN users u ON sub.student_id = u.id
      WHERE ${whereClause}
      ORDER BY sub.submitted_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const submissionsResult = await query(submissionsQuery, queryParams);

    const submissions = submissionsResult.rows.map(row => ({
      id: row.id,
      assignmentId: row.assignment_id,
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
      status: row.status || 'submitted', // Default to 'submitted' if null
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      submissions,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        maxMarks: parseFloat(assignment.max_marks),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Assignment Submissions GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch submissions',
      },
      { status: error.status || 500 }
    );
  }
}

