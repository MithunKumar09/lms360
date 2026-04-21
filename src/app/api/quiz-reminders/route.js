/**
 * Quiz Reminders API Route
 * 
 * Handles quiz reminder operations.
 * 
 * GET /api/quiz-reminders - List reminders (role-scoped)
 * POST /api/quiz-reminders - Create reminder
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/quiz-reminders
 * List reminders (role-scoped)
 * 
 * Query Parameters:
 * - quizId: Filter by quiz ID
 * - studentId: Filter by student ID (instructor/admin only)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - isSent: Filter by sent status (true/false)
 */
export async function GET(request) {
  try {
    // Allow student, instructor, admin, and superadmin
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const quizId = searchParams.get('quizId') || null;
    const studentId = searchParams.get('studentId') || null;
    const isSent = searchParams.get('isSent') || null;

    // Build WHERE conditions based on role
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (userRole === 'student') {
      // Student: Only their own reminders
      whereConditions.push(`qr.student_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'instructor') {
      // Instructor: Reminders for quizzes from their courses
      whereConditions.push(`EXISTS (
        SELECT 1 FROM quizzes q
        WHERE q.id = qr.quiz_id AND (
          (q.course_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM courses c 
            WHERE c.id = q.course_id AND c.created_by = $${paramIndex}
          )) OR
          (q.course_id IS NULL AND q.created_by = $${paramIndex})
        )
      )`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'admin') {
      // Admin: Reminders for quizzes from their organization
      if (userOrgId) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM quizzes q
          WHERE q.id = qr.quiz_id AND q.org_id = $${paramIndex}
        )`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Admin with no org: Only reminders for quizzes they created
        whereConditions.push(`EXISTS (
          SELECT 1 FROM quizzes q
          WHERE q.id = qr.quiz_id AND q.org_id IS NULL AND q.created_by = $${paramIndex}
        )`);
        queryParams.push(userId);
        paramIndex++;
      }
    }
    // Superadmin: Can see all reminders (no additional filter)

    // Filter by quiz
    if (quizId) {
      whereConditions.push(`qr.quiz_id = $${paramIndex}`);
      queryParams.push(quizId);
      paramIndex++;
    }

    // Filter by student (instructor/admin only)
    if (studentId) {
      if (userRole === 'student') {
        // Students can only see their own reminders
        // If they pass their own ID, ignore it (already filtered above)
        // If they pass a different ID, reject it
        if (studentId !== userId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to view other students\' reminders',
            },
            { status: 403 }
          );
        }
        // If studentId matches userId, ignore the parameter (already filtered above)
      } else {
        // For instructor/admin/superadmin, allow filtering by studentId
        whereConditions.push(`qr.student_id = $${paramIndex}`);
        queryParams.push(studentId);
        paramIndex++;
      }
    }

    // Filter by sent status
    if (isSent !== null && isSent !== '') {
      const isSentBool = isSent === 'true';
      whereConditions.push(`qr.is_sent = $${paramIndex}`);
      queryParams.push(isSentBool);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quiz_reminders qr
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get reminders with quiz and student info
    const remindersQuery = `
      SELECT 
        qr.id,
        qr.quiz_id,
        qr.student_id,
        qr.reminder_type,
        qr.reminder_time,
        qr.is_sent,
        qr.sent_at,
        qr.created_at,
        q.title as quiz_title,
        u.email as student_email
      FROM quiz_reminders qr
      LEFT JOIN quizzes q ON qr.quiz_id = q.id
      LEFT JOIN users u ON qr.student_id = u.id
      ${whereClause}
      ORDER BY qr.reminder_time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const remindersResult = await query(remindersQuery, queryParams);

    const reminders = remindersResult.rows.map(row => ({
      id: row.id,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      studentId: row.student_id,
      studentEmail: row.student_email,
      reminderType: row.reminder_type,
      reminderTime: row.reminder_time,
      isSent: row.is_sent,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      reminders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Reminders GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch reminders',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/quiz-reminders
 * Create quiz reminder
 * 
 * Body:
 * - quizId: UUID (required)
 * - reminderType: 'email' | 'push' | 'sms' | 'in_app' (required)
 * - reminderTime: ISO 8601 datetime string (required, must be in future)
 */
export async function POST(request) {
  try {
    // Allow student, instructor, admin (for their quizzes)
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const body = await request.json();
    const {
      quizId,
      reminderType,
      reminderTime,
      studentId = null, // For instructor/admin creating reminders for students
    } = body;

    // Validation
    if (!quizId) {
      return NextResponse.json(
        { success: false, error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    if (!reminderType || !['email', 'push', 'sms', 'in_app'].includes(reminderType)) {
      return NextResponse.json(
        { success: false, error: 'Reminder type must be email, push, sms, or in_app' },
        { status: 400 }
      );
    }

    if (!reminderTime) {
      return NextResponse.json(
        { success: false, error: 'Reminder time is required' },
        { status: 400 }
      );
    }

    const reminderTimeDate = new Date(reminderTime);
    if (isNaN(reminderTimeDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid reminder time format' },
        { status: 400 }
      );
    }

    // Check if reminder time is in the future
    if (reminderTimeDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Reminder time must be in the future' },
        { status: 400 }
      );
    }

    // Determine student ID
    let finalStudentId = userId; // Default to current user
    if (studentId && studentId !== userId) {
      // Instructor/admin can create reminders for students
      if (userRole === 'student') {
        return NextResponse.json(
          { success: false, error: 'You can only create reminders for yourself' },
          { status: 403 }
        );
      }
      finalStudentId = studentId;
    }

    // Verify quiz exists and user has access
    const quizCheckQuery = `
      SELECT id, org_id, created_by, course_id, title
      FROM quizzes
      WHERE id = $1
    `;
    const quizResult = await query(quizCheckQuery, [quizId]);

    if (quizResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = quizResult.rows[0];

    // Verify access based on role
    if (userRole === 'student') {
      // Students can only create reminders for quizzes they have access to
      // This would require checking enrollment, but for now we allow it
      // In a full implementation, you'd check course enrollment or quiz visibility
    } else if (userRole === 'instructor') {
      // Instructor: Only for quizzes from their courses
      if (quiz.course_id) {
        const courseCheck = await query(
          `SELECT id, created_by FROM courses WHERE id = $1 AND created_by = $2`,
          [quiz.course_id, userId]
        );
        if (courseCheck.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to create reminders for this quiz' },
            { status: 403 }
          );
        }
      } else if (quiz.created_by !== userId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to create reminders for this quiz' },
          { status: 403 }
        );
      }
    } else if (userRole === 'admin') {
      // Admin: Only for quizzes from their organization
      if (userOrgId) {
        if (quiz.org_id !== userOrgId) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to create reminders for this quiz' },
            { status: 403 }
          );
        }
      } else {
        if (quiz.org_id !== null || quiz.created_by !== userId) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to create reminders for this quiz' },
            { status: 403 }
          );
        }
      }
    }
    // Superadmin can create reminders for any quiz

    // Verify student exists (if different from current user)
    if (finalStudentId !== userId) {
      const studentCheck = await query(
        `SELECT id FROM users WHERE id = $1 AND role = 'student'`,
        [finalStudentId]
      );
      if (studentCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Student not found' },
          { status: 404 }
        );
      }
    }

    // Insert reminder
    const insertQuery = `
      INSERT INTO quiz_reminders (
        quiz_id,
        student_id,
        reminder_type,
        reminder_time
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;

    const result = await query(insertQuery, [
      quizId,
      finalStudentId,
      reminderType,
      reminderTimeDate.toISOString(),
    ]);

    return NextResponse.json({
      success: true,
      reminder: {
        id: result.rows[0].id,
        quizId,
        quizTitle: quiz.title,
        studentId: finalStudentId,
        reminderType,
        reminderTime: reminderTimeDate.toISOString(),
        isSent: false,
        sentAt: null,
        createdAt: result.rows[0].created_at,
      },
      message: 'Reminder created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('❌ [API] [Quiz Reminders POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create reminder',
      },
      { status: error.status || 500 }
    );
  }
}

