/**
 * Submission Messages API Route
 * 
 * GET /api/assignments/submissions/:id/messages - Get messages for a submission
 * POST /api/assignments/submissions/:id/messages - Send a message
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/assignments/submissions/:id/messages
 * Get messages for a submission
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
      // Instructor can only see messages for submissions of assignments they created
      whereClause = 'sub.id = $1 AND a.created_by = $2';
      queryParams = [submissionId, userId];
    } else if (userRole === 'student') {
      // Student can only see messages for their own submissions
      whereClause = 'sub.id = $1 AND sub.student_id = $2';
      queryParams = [submissionId, userId];
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify submission belongs to user (instructor or student)
    // Note: Using 'sub' as alias instead of 'as' (which is a SQL reserved keyword)
    const checkQuery = `
      SELECT sub.id
      FROM assignment_submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      WHERE ${whereClause}
    `;
    const checkResult = await query(checkQuery, queryParams);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found or you do not have permission' },
        { status: 403 }
      );
    }

    // Get messages
    const messagesQuery = `
      SELECT 
        sm.id,
        sm.submission_id,
        sm.submission_type,
        sm.sender_id,
        sm.message_text,
        sm.created_at,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        u.role
      FROM submission_messages sm
      JOIN users u ON sm.sender_id = u.id
      WHERE sm.submission_id = $1 AND sm.submission_type = 'assignment'
      ORDER BY sm.created_at ASC
    `;
    const messagesResult = await query(messagesQuery, [submissionId]);

    const messages = messagesResult.rows.map(row => ({
      id: row.id,
      submissionId: row.submission_id,
      submissionType: row.submission_type,
      senderId: row.sender_id,
      senderName: `${row.first_name} ${row.last_name}`,
      senderEmail: row.email,
      senderAvatar: row.avatar_url,
      senderRole: row.role,
      messageText: row.message_text,
      createdAt: row.created_at,
      isCurrentUser: row.sender_id === userId,
    }));

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('❌ [API] [Submission Messages GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch messages',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/assignments/submissions/:id/messages
 * Send a message
 * Supports both instructor and student roles
 */
export async function POST(request, context) {
  try {
    const params = await context.params;
    const session = await requireRole(request, ['instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const submissionId = params.id;

    const body = await request.json();
    const { messageText } = body;

    if (!messageText || messageText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message text is required' },
        { status: 400 }
      );
    }

    // Build WHERE clause based on user role
    let whereClause;
    let queryParams;
    
    if (userRole === 'instructor') {
      // Instructor can only send messages for submissions of assignments they created
      whereClause = 'sub.id = $1 AND a.created_by = $2';
      queryParams = [submissionId, userId];
    } else if (userRole === 'student') {
      // Student can only send messages for their own submissions
      whereClause = 'sub.id = $1 AND sub.student_id = $2';
      queryParams = [submissionId, userId];
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify submission belongs to user (instructor or student)
    // Note: Using 'sub' as alias instead of 'as' (which is a SQL reserved keyword)
    const checkQuery = `
      SELECT sub.id, sub.student_id
      FROM assignment_submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      WHERE ${whereClause}
    `;
    const checkResult = await query(checkQuery, queryParams);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found or you do not have permission' },
        { status: 403 }
      );
    }

    // Insert message
    const insertQuery = `
      INSERT INTO submission_messages (
        submission_id,
        submission_type,
        sender_id,
        message_text
      ) VALUES ($1, 'assignment', $2, $3)
      RETURNING id, created_at
    `;
    const result = await query(insertQuery, [
      submissionId,
      userId,
      messageText.trim(),
    ]);

    const message = result.rows[0];

    // Get sender info
    const senderQuery = `
      SELECT first_name, last_name, email, avatar_url, role
      FROM users
      WHERE id = $1
    `;
    const senderResult = await query(senderQuery, [userId]);
    const sender = senderResult.rows[0];

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        submissionId,
        submissionType: 'assignment',
        senderId: userId,
        senderName: `${sender.first_name} ${sender.last_name}`,
        senderEmail: sender.email,
        senderAvatar: sender.avatar_url,
        senderRole: sender.role,
        messageText: messageText.trim(),
        createdAt: message.created_at,
        isCurrentUser: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('❌ [API] [Submission Messages POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send message',
      },
      { status: error.status || 500 }
    );
  }
}

