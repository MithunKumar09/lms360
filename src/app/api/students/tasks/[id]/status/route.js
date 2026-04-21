/**
 * Student Task Status API Route
 * 
 * PUT /api/students/tasks/:id/status - Update task status (student only)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import {
  createTaskCompletedActivity,
  createTaskInProgressActivity,
} from '@/lib/db/mentorActivityFeed.js';

/**
 * PUT /api/students/tasks/:id/status
 * Update task status (student can only set to 'in_progress' or 'completed')
 * 
 * Request Body:
 * {
 *   status: string ('in_progress' | 'completed')
 * }
 */
export async function PUT(request, { params }) {
  try {
    console.log('📋 [STUDENT TASK STATUS] ===== UPDATE TASK STATUS STARTED =====');
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task ID is required',
        },
        { status: 400 }
      );
    }
    
    const { id } = params;

    // Require student role
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
    
    const studentId = session.user.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { status } = body;

    // Validation
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      );
    }

    // Students can only set status to 'in_progress' or 'completed'
    const allowedStatuses = ['in_progress', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if task exists and belongs to student
    const taskCheckQuery = `
      SELECT id, student_id, status
      FROM mentor_tasks
      WHERE id = $1 AND student_id = $2
    `;
    const taskCheckResult = await query(taskCheckQuery, [id, studentId]);

    if (!Array.isArray(taskCheckResult?.rows) || taskCheckResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    const currentStatus = taskCheckResult.rows[0]?.status || null;

    // Build update query
    let updateFields = [`status = $1`];
    const updateValues = [status];

    // Set completed_at if status is completed
    if (status === 'completed') {
      updateFields.push(`completed_at = $2`);
      updateValues.push(new Date().toISOString());
    } else if (status === 'in_progress' && currentStatus === 'completed') {
      // If changing from completed back to in_progress, clear completed_at
      updateFields.push(`completed_at = $2`);
      updateValues.push(null);
    }

    updateValues.push(id);
    updateValues.push(studentId);

    // Update task
    const updateQuery = `
      UPDATE mentor_tasks
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length - 1} AND student_id = $${updateValues.length}
      RETURNING *
    `;

    const updateResult = await query(updateQuery, updateValues);

    if (!Array.isArray(updateResult?.rows) || updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    const task = updateResult.rows[0];
    if (!task || typeof task !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid task data' },
        { status: 500 }
      );
    }

    // Get mentor and cohort info
    const infoQuery = `
      SELECT 
        u.id as mentor_user_id,
        u.first_name as mentor_first_name,
        u.last_name as mentor_last_name,
        u.email as mentor_email,
        u.avatar_url as mentor_avatar_url,
        c.code as cohort_code,
        c.level as cohort_level
      FROM users u
      LEFT JOIN mentor_tasks mt ON mt.id = $2
      LEFT JOIN cohorts c ON mt.cohort_id = c.id
      WHERE u.id = $1
    `;
    const infoResult = await query(infoQuery, [task.mentor_id, id]);
    const infoRow = (Array.isArray(infoResult?.rows) && infoResult.rows[0]) || null;

    const taskResponse = {
      id: task.id,
      mentorId: task.mentor_id,
      studentId: task.student_id,
      cohortId: task.cohort_id,
      title: task.title,
      description: task.description,
      taskType: task.task_type,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      createdBy: task.created_by,
      mentor: infoRow ? {
        id: infoRow.mentor_user_id,
        firstName: infoRow.mentor_first_name,
        lastName: infoRow.mentor_last_name,
        email: infoRow.mentor_email,
        avatarUrl: infoRow.mentor_avatar_url,
      } : null,
      cohort: infoRow?.cohort_code ? {
        code: infoRow.cohort_code,
        level: infoRow.cohort_level,
      } : null,
    };

    // Create activity feed entry
    try {
      if (status === 'completed') {
        await createTaskCompletedActivity({
          mentorId: task.mentor_id,
          studentId: studentId,
          cohortId: task.cohort_id,
          taskId: task.id,
          taskTitle: task.title,
          createdBy: studentId,
        });
      } else if (status === 'in_progress') {
        await createTaskInProgressActivity({
          mentorId: task.mentor_id,
          studentId: studentId,
          cohortId: task.cohort_id,
          taskId: task.id,
          taskTitle: task.title,
          createdBy: studentId,
        });
      }
    } catch (activityError) {
      // Log error but don't fail the request
      console.error('📰 [STUDENT TASK STATUS] Failed to create activity feed entry:', activityError);
    }

    console.log('📋 [STUDENT TASK STATUS] ✅ Task status updated:', id, status);

    return NextResponse.json(
      {
        success: true,
        data: {
          task: taskResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📋 [STUDENT TASK STATUS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update task status' 
      },
      { status: 500 }
    );
  }
}
