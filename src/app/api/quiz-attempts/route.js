/**
 * Quiz Attempts API Route
 * 
 * GET /api/quiz-attempts - List all quiz attempts (role-scoped)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/quiz-attempts
 * List all quiz attempts (role-scoped)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - quizId: Filter by quiz ID
 * - status: Filter by status (in_progress, submitted, timeout, abandoned)
 * - orgId: Filter by organization ID (superadmin only)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const quizId = searchParams.get('quizId') || null;
    const status = searchParams.get('status') || null;
    const orgId = searchParams.get('orgId') || null;
    const studentId = searchParams.get('studentId') || null;

    // Build WHERE conditions based on role
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Role-based quiz filtering
    if (userRole === 'student') {
      // Student: Only their own attempts
      whereConditions.push(`qa.student_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'superadmin') {
      // Superadmin: Can see attempts for all quizzes (global + all orgs)
      // If orgId filter is provided, filter by org
      if (orgId) {
        whereConditions.push(`q.org_id = $${paramIndex}`);
        queryParams.push(orgId);
        paramIndex++;
      }
    } else if (userRole === 'admin') {
      // Admin: Only attempts for quizzes from their organization
      if (userOrgId) {
        whereConditions.push(`q.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Admin with no org: Only global quizzes they created
        whereConditions.push(`q.org_id IS NULL AND q.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
    } else if (userRole === 'instructor') {
      // Instructor: Attempts for quizzes from their courses AND standalone quizzes they created
      whereConditions.push(`(
        (q.course_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM courses c 
          WHERE c.id = q.course_id AND c.created_by = $${paramIndex}
        )) OR
        (q.course_id IS NULL AND q.created_by = $${paramIndex})
      )`);
      queryParams.push(userId);
      paramIndex++;
    }

    // Filter by quiz
    if (quizId) {
      whereConditions.push(`qa.quiz_id = $${paramIndex}`);
      queryParams.push(quizId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      whereConditions.push(`qa.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Filter by studentId (for admin/instructor/superadmin viewing specific student)
    if (studentId && userRole !== 'student') {
      whereConditions.push(`qa.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get attempts with quiz and student info
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
        q.id as quiz_id,
        q.title as quiz_title,
        q.total_marks,
        q.passing_marks,
        q.org_id as quiz_org_id,
        q.course_id as quiz_course_id,
        c.title as course_title,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN users u ON qa.student_id = u.id
      LEFT JOIN courses c ON q.course_id = c.id
      ${whereClause}
      ORDER BY qa.submitted_at DESC NULLS LAST, qa.started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const attemptsResult = await query(attemptsQuery, queryParams);

    const attempts = attemptsResult.rows.map(row => ({
      id: row.id,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      quizTotalMarks: parseFloat(row.total_marks),
      quizPassingMarks: parseFloat(row.passing_marks),
      courseTitle: row.course_title,
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
      questionCount: parseInt(row.question_count, 10),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      attempts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Attempts GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quiz attempts',
      },
      { status: error.status || 500 }
    );
  }
}

