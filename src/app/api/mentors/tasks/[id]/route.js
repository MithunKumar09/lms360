/**
 * Mentor Task Detail API Route
 * 
 * GET /api/mentors/tasks/:id - Get task details
 * PUT /api/mentors/tasks/:id - Update task
 * DELETE /api/mentors/tasks/:id - Delete task
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import {
  createTaskUpdatedActivity,
  createTaskCancelledActivity,
  createTaskCompletedActivity,
  createTaskInProgressActivity,
} from '@/lib/db/mentorActivityFeed.js';

/**
 * GET /api/mentors/tasks/:id
 * Get task details with attachments and comments
 * Allows both mentors and students (students can view tasks assigned to them)
 */
export async function GET(request, { params }) {
  try {
    console.log('📋 [MENTOR TASK DETAIL] ===== GET TASK STARTED =====');
    
    const { id } = params;

    // Require mentor or student role
    const session = await requireRole(request, ['mentor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;

    // Get task with student and cohort info
    // Check if user is mentor (owner) or student (assigned to)
    const taskQuery = `
      SELECT 
        mt.id,
        mt.mentor_id,
        mt.student_id,
        mt.cohort_id,
        mt.title,
        mt.description,
        mt.task_type,
        mt.status,
        mt.priority,
        mt.due_date,
        mt.completed_at,
        mt.created_at,
        mt.updated_at,
        mt.created_by,
        s.id as student_user_id,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.email as student_email,
        s.avatar_url as student_avatar_url,
        m.id as mentor_user_id,
        m.first_name as mentor_first_name,
        m.last_name as mentor_last_name,
        m.email as mentor_email,
        m.avatar_url as mentor_avatar_url,
        c.code as cohort_code,
        c.level as cohort_level
      FROM mentor_tasks mt
      INNER JOIN users s ON mt.student_id = s.id
      INNER JOIN users m ON mt.mentor_id = m.id
      LEFT JOIN cohorts c ON mt.cohort_id = c.id
      WHERE mt.id = $1 AND (
        (mt.mentor_id = $2 AND $3 = 'mentor') OR
        (mt.student_id = $2 AND $3 = 'student')
      )
    `;

    const taskResult = await query(taskQuery, [id, userId, userRole]);

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    const taskRow = taskResult.rows[0];
    
    // Determine if we should show mentor or student info based on user role
    const showMentorInfo = userRole === 'student';
    const showStudentInfo = userRole === 'mentor';

    // Get attachments
    const attachmentsQuery = `
      SELECT 
        id,
        file_key,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        uploaded_by,
        created_at
      FROM mentor_task_attachments
      WHERE task_id = $1
      ORDER BY created_at DESC
    `;
    const attachmentsResult = await query(attachmentsQuery, [id]);

    // Get comments
    const commentsQuery = `
      SELECT 
        mtc.id,
        mtc.user_id,
        mtc.comment,
        mtc.created_at,
        mtc.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM mentor_task_comments mtc
      INNER JOIN users u ON mtc.user_id = u.id
      WHERE mtc.task_id = $1
      ORDER BY mtc.created_at ASC
    `;
    const commentsResult = await query(commentsQuery, [id]);

    const task = {
      id: taskRow.id,
      mentorId: taskRow.mentor_id,
      studentId: taskRow.student_id,
      cohortId: taskRow.cohort_id,
      title: taskRow.title,
      description: taskRow.description,
      taskType: taskRow.task_type,
      status: taskRow.status,
      priority: taskRow.priority,
      dueDate: taskRow.due_date,
      completedAt: taskRow.completed_at,
      createdAt: taskRow.created_at,
      updatedAt: taskRow.updated_at,
      createdBy: taskRow.created_by,
      student: showStudentInfo ? {
        id: taskRow.student_user_id,
        firstName: taskRow.student_first_name,
        lastName: taskRow.student_last_name,
        email: taskRow.student_email,
        avatarUrl: taskRow.student_avatar_url,
      } : null,
      mentor: showMentorInfo ? {
        id: taskRow.mentor_user_id,
        firstName: taskRow.mentor_first_name,
        lastName: taskRow.mentor_last_name,
        email: taskRow.mentor_email,
        avatarUrl: taskRow.mentor_avatar_url,
      } : null,
      cohort: taskRow.cohort_code ? {
        code: taskRow.cohort_code,
        level: taskRow.cohort_level,
      } : null,
      attachments: attachmentsResult.rows.map(row => ({
        id: row.id,
        fileKey: row.file_key,
        fileUrl: row.file_url,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSizeBytes: row.file_size_bytes,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
      })),
      comments: commentsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        comment: row.comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          avatarUrl: row.avatar_url,
        },
      })),
    };

    console.log('📋 [MENTOR TASK DETAIL] ✅ Task fetched:', id);

    return NextResponse.json(
      {
        success: true,
        data: {
          task,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📋 [MENTOR TASK DETAIL] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch task' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentors/tasks/:id
 * Update task (mentor only)
 * 
 * Request Body (all optional):
 * {
 *   title: string,
 *   description: string,
 *   task_type: string,
 *   status: string,
 *   priority: string,
 *   due_date: string (ISO timestamp)
 * }
 */
export async function PUT(request, { params }) {
  try {
    console.log('📋 [MENTOR TASK UPDATE] ===== UPDATE TASK STARTED =====');
    
    const { id } = params;

    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Check if task exists and belongs to mentor
    const taskCheckQuery = `
      SELECT id, mentor_id
      FROM mentor_tasks
      WHERE id = $1 AND mentor_id = $2
    `;
    const taskCheckResult = await query(taskCheckQuery, [id, mentorId]);

    if (taskCheckResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      task_type,
      status,
      priority,
      due_date,
    } = body;

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'title cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    if (task_type !== undefined) {
      const validTaskTypes = ['general', 'assignment', 'project', 'review'];
      if (!validTaskTypes.includes(task_type)) {
        return NextResponse.json(
          { success: false, error: `task_type must be one of: ${validTaskTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updateFields.push(`task_type = $${paramIndex}`);
      updateValues.push(task_type);
      paramIndex++;
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
      
      // Set completed_at if status is completed, clear if not
      if (status === 'completed') {
        updateFields.push(`completed_at = $${paramIndex}`);
        updateValues.push(new Date().toISOString());
        paramIndex++;
      } else {
        updateFields.push(`completed_at = $${paramIndex}`);
        updateValues.push(null);
        paramIndex++;
      }
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { success: false, error: `priority must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }
      updateFields.push(`priority = $${paramIndex}`);
      updateValues.push(priority);
      paramIndex++;
    }

    if (due_date !== undefined) {
      let dueDateTimestamp = null;
      if (due_date) {
        if (isNaN(new Date(due_date).getTime())) {
          return NextResponse.json(
            { success: false, error: 'Invalid due_date format. Use ISO timestamp.' },
            { status: 400 }
          );
        }
        dueDateTimestamp = new Date(due_date).toISOString();
      }
      updateFields.push(`due_date = $${paramIndex}`);
      updateValues.push(dueDateTimestamp);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add task id for WHERE clause
    updateValues.push(id);

    // Update task
    const updateQuery = `
      UPDATE mentor_tasks
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND mentor_id = $${paramIndex + 1}
      RETURNING *
    `;
    updateValues.push(mentorId);

    const updateResult = await query(updateQuery, updateValues);

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    const task = updateResult.rows[0];

    // Get student and cohort info
    const infoQuery = `
      SELECT 
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        u.avatar_url as student_avatar_url,
        c.code as cohort_code,
        c.level as cohort_level
      FROM users u
      LEFT JOIN cohorts c ON $2 = c.id
      WHERE u.id = $1
    `;
    const infoResult = await query(infoQuery, [task.student_id, task.cohort_id || null]);
    const infoRow = infoResult.rows[0];

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
      student: infoRow ? {
        id: infoRow.student_user_id,
        firstName: infoRow.student_first_name,
        lastName: infoRow.student_last_name,
        email: infoRow.student_email,
        avatarUrl: infoRow.student_avatar_url,
      } : null,
      cohort: infoRow?.cohort_code ? {
        code: infoRow.cohort_code,
        level: infoRow.cohort_level,
      } : null,
    };

    // Create activity feed entry for update or cancellation
    // Note: Status changes to completed/in_progress are typically done by students, 
    // but mentor can update status to cancelled or make other general updates
    try {
      if (status === 'cancelled') {
        await createTaskCancelledActivity({
          mentorId: mentorId,
          studentId: task.student_id,
          cohortId: task.cohort_id,
          taskId: task.id,
          taskTitle: task.title,
          createdBy: mentorId,
        });
      } else if (updateFields.length > 0) {
        // General update (title, description, priority, due_date, etc.)
        // Only create if something actually changed (excluding status changes handled by students)
        const hasNonStatusUpdate = title !== undefined || description !== undefined || 
                                   priority !== undefined || due_date !== undefined || task_type !== undefined;
        if (hasNonStatusUpdate || (status !== undefined && status !== 'completed' && status !== 'in_progress')) {
          await createTaskUpdatedActivity({
            mentorId: mentorId,
            studentId: task.student_id,
            cohortId: task.cohort_id,
            taskId: task.id,
            taskTitle: task.title,
            createdBy: mentorId,
          });
        }
      }
    } catch (activityError) {
      // Log error but don't fail the request
      console.error('📰 [MENTOR TASK UPDATE] Failed to create activity feed entry:', activityError);
    }

    console.log('📋 [MENTOR TASK UPDATE] ✅ Task updated:', id);

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
    console.error('📋 [MENTOR TASK UPDATE] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update task' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentors/tasks/:id
 * Delete task (mentor only)
 */
export async function DELETE(request, { params }) {
  try {
    console.log('📋 [MENTOR TASK DELETE] ===== DELETE TASK STARTED =====');
    
    const { id } = params;

    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Check if task exists and belongs to mentor (get task details for activity feed)
    const taskCheckQuery = `
      SELECT id, mentor_id, student_id, cohort_id, title
      FROM mentor_tasks
      WHERE id = $1 AND mentor_id = $2
    `;
    const taskCheckResult = await query(taskCheckQuery, [id, mentorId]);

    if (taskCheckResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    const taskToDelete = taskCheckResult.rows[0];

    // Delete task (CASCADE will handle attachments and comments)
    const deleteQuery = `
      DELETE FROM mentor_tasks
      WHERE id = $1 AND mentor_id = $2
    `;
    await query(deleteQuery, [id, mentorId]);

    // Create activity feed entry for deletion
    try {
      await createTaskCancelledActivity({
        mentorId: taskToDelete.mentor_id,
        studentId: taskToDelete.student_id,
        cohortId: taskToDelete.cohort_id,
        taskId: taskToDelete.id,
        taskTitle: taskToDelete.title,
        createdBy: mentorId,
      });
    } catch (activityError) {
      // Log error but don't fail the request
      console.error('📰 [MENTOR TASK DELETE] Failed to create activity feed entry:', activityError);
    }

    console.log('📋 [MENTOR TASK DELETE] ✅ Task deleted:', id);

    return NextResponse.json(
      {
        success: true,
        message: 'Task deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📋 [MENTOR TASK DELETE] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete task' 
      },
      { status: 500 }
    );
  }
}
