/**
 * Quiz Submissions API Route
 * 
 * GET /api/quizzes/:id/submissions - List quiz attempts/submissions
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/quizzes/:id/submissions
 * List quiz attempts/submissions (role-scoped)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const status = searchParams.get('status') || null;

    // Verify quiz access based on role
    const quizCheckQuery = `
      SELECT id, org_id, course_id, created_by, title, total_marks, passing_marks
      FROM quizzes
      WHERE id = $1
    `;
    const quizCheck = await query(quizCheckQuery, [quizId]);
    if (quizCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = quizCheck.rows[0];

    // Role-based permission check
    if (userRole === 'admin') {
      if (userOrgId && quiz.org_id !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this quiz' },
          { status: 403 }
        );
      }
      if (!userOrgId && quiz.org_id !== null) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this quiz' },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      // Instructor: Can view if quiz is from their course or standalone quiz they created
      if (quiz.course_id) {
        const courseCheck = await query(
          `SELECT created_by FROM courses WHERE id = $1`,
          [quiz.course_id]
        );
        if (courseCheck.rows.length === 0 || courseCheck.rows[0].created_by !== userId) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to view this quiz' },
            { status: 403 }
          );
        }
      } else if (quiz.created_by !== userId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this quiz' },
          { status: 403 }
        );
      }
    }
    // Superadmin can view any quiz

    // Build WHERE conditions
    const whereConditions = ['qa.quiz_id = $1'];
    const queryParams = [quizId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`qa.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quiz_attempts qa
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get attempts with student info
    const attemptsQuery = `
      SELECT 
        qa.id,
        qa.quiz_id,
        qa.student_id,
        qa.started_at,
        qa.submitted_at,
        qa.time_taken_seconds,
        qa.marks_obtained,
        qa.percentage_score,
        qa.is_passed,
        qa.status,
        qa.created_at,
        qa.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
      WHERE ${whereClause}
      ORDER BY qa.submitted_at DESC NULLS LAST, qa.started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const attemptsResult = await query(attemptsQuery, queryParams);

    const attempts = attemptsResult.rows.map(row => ({
      id: row.id,
      quizId: row.quiz_id,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      studentEmail: row.email,
      studentAvatar: row.avatar_url,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      timeTakenSeconds: row.time_taken_seconds,
      marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
      percentageScore: row.percentage_score ? parseFloat(row.percentage_score) : null,
      isPassed: row.is_passed,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      attempts,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        totalMarks: parseFloat(quiz.total_marks),
        passingMarks: parseFloat(quiz.passing_marks),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Submissions GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch submissions',
      },
      { status: error.status || 500 }
    );
  }
}

