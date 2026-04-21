/**
 * Quiz Reminder API Route (Single Reminder)
 * 
 * DELETE /api/quiz-reminders/:id - Delete reminder
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * DELETE /api/quiz-reminders/:id
 * Delete reminder
 */
export async function DELETE(request, { params }) {
  try {
    // Allow student, instructor, admin, and superadmin
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const reminderId = params.id;

    // First, get the reminder to check permissions
    const reminderQuery = `
      SELECT 
        qr.id,
        qr.quiz_id,
        qr.student_id,
        q.org_id,
        q.created_by,
        q.course_id
      FROM quiz_reminders qr
      LEFT JOIN quizzes q ON qr.quiz_id = q.id
      WHERE qr.id = $1
    `;
    const reminderResult = await query(reminderQuery, [reminderId]);

    if (reminderResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reminder not found',
        },
        { status: 404 }
      );
    }

    const reminder = reminderResult.rows[0];

    // Check permissions
    if (userRole === 'student') {
      // Student: Can only delete their own reminders
      if (reminder.student_id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to delete this reminder',
          },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      // Instructor: Can delete reminders for quizzes from their courses
      if (reminder.course_id) {
        const courseCheck = await query(
          `SELECT id, created_by FROM courses WHERE id = $1 AND created_by = $2`,
          [reminder.course_id, userId]
        );
        if (courseCheck.rows.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to delete this reminder',
            },
            { status: 403 }
          );
        }
      } else if (reminder.created_by !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to delete this reminder',
          },
          { status: 403 }
        );
      }
    } else if (userRole === 'admin') {
      // Admin: Can delete reminders for quizzes from their organization
      if (userOrgId) {
        if (reminder.org_id !== userOrgId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to delete this reminder',
            },
            { status: 403 }
          );
        }
      } else {
        if (reminder.org_id !== null || reminder.created_by !== userId) {
          return NextResponse.json(
            {
              success: false,
              error: 'You do not have permission to delete this reminder',
            },
            { status: 403 }
          );
        }
      }
    }
    // Superadmin can delete any reminder

    // Delete reminder
    const deleteQuery = `
      DELETE FROM quiz_reminders
      WHERE id = $1
      RETURNING id
    `;
    const deleteResult = await query(deleteQuery, [reminderId]);

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete reminder',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Reminder DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete reminder',
      },
      { status: error.status || 500 }
    );
  }
}

