/**
 * Task Comments API Route
 * 
 * POST /api/mentors/tasks/:id/comments - Add comment to task
 * GET /api/mentors/tasks/:id/comments - Get task comments
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { createTaskCommentActivity } from '@/lib/db/mentorActivityFeed.js';

/**
 * POST /api/mentors/tasks/:id/comments
 * Add comment to task
 * 
 * Request Body:
 * - comment: string (1-5000 characters, required)
 */
export async function POST(request, { params }) {
  try {
    console.log('💬 [TASK COMMENTS] ===== ADD COMMENT STARTED =====');
    
    const { id } = params;

    // Require mentor or student role
    const session = await requireRole(request, ['mentor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;

    const body = await request.json();
    const { comment } = body;

    // Validation
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'comment is required' },
        { status: 400 }
      );
    }

    if (comment.trim().length > 5000) {
      return NextResponse.json(
        { success: false, error: 'comment must be at most 5000 characters' },
        { status: 400 }
      );
    }

    // Verify task exists and user has access
    const taskQuery = `
      SELECT id, mentor_id, student_id
      FROM mentor_tasks
      WHERE id = $1
    `;
    const taskResult = await query(taskQuery, [id]);

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Verify user has access
    if (userRole === 'mentor' && task.mentor_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    if (userRole === 'student' && task.student_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Insert comment
    const insertQuery = `
      INSERT INTO mentor_task_comments (
        task_id,
        user_id,
        comment
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const insertResult = await query(insertQuery, [
      id,
      userId,
      comment.trim(),
    ]);

    const commentRecord = insertResult.rows[0];

    // Get user info for response
    const userQuery = `
      SELECT id, first_name, last_name, email, avatar_url
      FROM users
      WHERE id = $1
    `;
    const userResult = await query(userQuery, [userId]);
    const user = userResult.rows[0];

    // Get task info for activity feed
    const taskInfoQuery = `
      SELECT title, mentor_id, student_id, cohort_id
      FROM mentor_tasks
      WHERE id = $1
    `;
    const taskInfoResult = await query(taskInfoQuery, [id]);
    const taskInfo = taskInfoResult.rows[0];

    const commentResponse = {
      id: commentRecord.id,
      taskId: commentRecord.task_id,
      userId: commentRecord.user_id,
      comment: commentRecord.comment,
      createdAt: commentRecord.created_at,
      updatedAt: commentRecord.updated_at,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        avatarUrl: user.avatar_url,
      },
    };

    // Create activity feed entry
    try {
      await createTaskCommentActivity({
        mentorId: taskInfo.mentor_id,
        studentId: taskInfo.student_id,
        cohortId: taskInfo.cohort_id,
        taskId: id,
        taskTitle: taskInfo.title,
        commentId: commentRecord.id,
        createdBy: userId,
      });
    } catch (activityError) {
      // Log error but don't fail the request
      console.error('📰 [TASK COMMENTS] Failed to create activity feed entry:', activityError);
    }

    console.log('💬 [TASK COMMENTS] ✅ Comment added:', commentRecord.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: commentResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('💬 [TASK COMMENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add comment' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mentors/tasks/:id/comments
 * Get task comments
 */
export async function GET(request, { params }) {
  try {
    console.log('💬 [TASK COMMENTS] ===== GET COMMENTS STARTED =====');
    
    const { id } = params;

    // Require mentor or student role
    const session = await requireRole(request, ['mentor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;

    // Verify task exists and user has access
    const taskQuery = `
      SELECT id, mentor_id, student_id
      FROM mentor_tasks
      WHERE id = $1
    `;
    const taskResult = await query(taskQuery, [id]);

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Verify user has access
    if (userRole === 'mentor' && task.mentor_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    if (userRole === 'student' && task.student_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get comments with user info
    const commentsQuery = `
      SELECT 
        mtc.id,
        mtc.task_id,
        mtc.user_id,
        mtc.comment,
        mtc.created_at,
        mtc.updated_at,
        u.id as user_user_id,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        u.avatar_url as user_avatar_url
      FROM mentor_task_comments mtc
      INNER JOIN users u ON mtc.user_id = u.id
      WHERE mtc.task_id = $1
      ORDER BY mtc.created_at ASC
    `;

    const commentsResult = await query(commentsQuery, [id]);

    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_user_id,
        firstName: row.user_first_name,
        lastName: row.user_last_name,
        email: row.user_email,
        avatarUrl: row.user_avatar_url,
      },
    }));

    console.log('💬 [TASK COMMENTS] ✅ Comments fetched:', comments.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          comments,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💬 [TASK COMMENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch comments' 
      },
      { status: 500 }
    );
  }
}
