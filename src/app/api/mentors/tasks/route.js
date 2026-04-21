/**
 * Mentor Tasks API Route
 * 
 * GET /api/mentors/tasks - List tasks for mentor
 * POST /api/mentors/tasks - Create a new task
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { createTaskCreatedActivity } from '@/lib/db/mentorActivityFeed.js';

/**
 * GET /api/mentors/tasks
 * List tasks for mentor with optional filters
 * 
 * Query Parameters:
 * - cohort_id: Filter by cohort
 * - student_id: Filter by student
 * - status: Filter by status (pending, in_progress, completed, overdue, cancelled)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request) {
  try {
    console.log('📋 [MENTOR TASKS] ===== GET TASKS STARTED =====');
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const mentorOrgId = session.user.orgId;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const cohortId = searchParams.get('cohort_id') || null;
    const studentId = searchParams.get('student_id') || null;
    const statusParam = searchParams.get('status');
    // Handle 'null' string or actual null - treat both as no filter
    const status = statusParam && statusParam !== 'null' && statusParam !== 'all' ? statusParam : null;

    // Build WHERE conditions
    const whereConditions = ['mt.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    // Filter by cohort
    if (cohortId) {
      whereConditions.push(`mt.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    // Filter by student
    if (studentId) {
      whereConditions.push(`mt.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    // Filter by status (only if status is provided and not 'null' or 'all')
    if (status) {
      whereConditions.push(`mt.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentor_tasks mt
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get tasks with student and cohort info
    const tasksQuery = `
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
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        u.avatar_url as student_avatar_url,
        c.code as cohort_code,
        c.level as cohort_level
      FROM mentor_tasks mt
      INNER JOIN users u ON mt.student_id = u.id
      LEFT JOIN cohorts c ON mt.cohort_id = c.id
      ${whereClause}
      ORDER BY 
        CASE mt.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        mt.due_date ASC NULLS LAST,
        mt.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const tasksResult = await query(tasksQuery, queryParams);

    const tasks = tasksResult.rows.map(row => ({
      id: row.id,
      mentorId: row.mentor_id,
      studentId: row.student_id,
      cohortId: row.cohort_id,
      title: row.title,
      description: row.description,
      taskType: row.task_type,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      student: {
        id: row.student_user_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        email: row.student_email,
        avatarUrl: row.student_avatar_url,
      },
      cohort: row.cohort_code ? {
        code: row.cohort_code,
        level: row.cohort_level,
      } : null,
    }));

    console.log('📋 [MENTOR TASKS] ✅ Tasks fetched:', tasks.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📋 [MENTOR TASKS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch tasks' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentors/tasks
 * Create a new task
 * 
 * Request Body:
 * {
 *   student_id: string (required),
 *   cohort_id: string (optional),
 *   title: string (required),
 *   description: string (optional),
 *   task_type: string (optional, default: 'general'),
 *   priority: string (optional, default: 'medium'),
 *   due_date: string (optional, ISO timestamp)
 * }
 */
export async function POST(request) {
  try {
    console.log('📋 [MENTOR TASKS] ===== CREATE TASK STARTED =====');
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const mentorOrgId = session.user.orgId;

    const body = await request.json();
    const {
      student_id,
      cohort_id,
      title,
      description,
      task_type = 'general',
      priority = 'medium',
      due_date,
    } = body;

    // Validation
    if (!student_id) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 }
      );
    }

    // Validate task type
    const validTaskTypes = ['general', 'assignment', 'project', 'review'];
    if (!validTaskTypes.includes(task_type)) {
      return NextResponse.json(
        { success: false, error: `task_type must be one of: ${validTaskTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, error: `priority must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate that mentor-student relationship exists and get cohort_id from relationship
    // First, try to find relationship with matching cohort_id if provided
    let relationshipQuery = '';
    let relationshipParams = [];
    
    if (cohort_id) {
      // If cohort_id provided, validate it matches the relationship
      relationshipQuery = `
        SELECT id, cohort_id
        FROM mentor_student_assignments
        WHERE mentor_id = $1 AND student_id = $2 AND cohort_id = $3
        LIMIT 1
      `;
      relationshipParams = [mentorId, student_id, cohort_id];
    } else {
      // If no cohort_id provided, get any relationship (prefer one with cohort_id)
      relationshipQuery = `
        SELECT id, cohort_id
        FROM mentor_student_assignments
        WHERE mentor_id = $1 AND student_id = $2
        ORDER BY cohort_id NULLS LAST
        LIMIT 1
      `;
      relationshipParams = [mentorId, student_id];
    }
    
    const relationshipResult = await query(relationshipQuery, relationshipParams);

    if (relationshipResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned as a mentor to this student' },
        { status: 403 }
      );
    }

    // Use cohort_id from relationship (it will match if provided, or use relationship's cohort_id)
    const finalCohortId = relationshipResult.rows[0].cohort_id;

    // Validate due_date format if provided
    let dueDateTimestamp = null;
    if (due_date) {
      dueDateTimestamp = new Date(due_date).toISOString();
      if (isNaN(new Date(due_date).getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid due_date format. Use ISO timestamp.' },
          { status: 400 }
        );
      }
    }

    // Create task
    const insertQuery = `
      INSERT INTO mentor_tasks (
        mentor_id,
        student_id,
        cohort_id,
        title,
        description,
        task_type,
        status,
        priority,
        due_date,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const insertParams = [
      mentorId,
      student_id,
      finalCohortId || null,
      title.trim(),
      description?.trim() || null,
      task_type,
      'pending',
      priority,
      dueDateTimestamp,
      mentorId,
    ];

    const insertResult = await query(insertQuery, insertParams);
    const task = insertResult.rows[0];

    // Get student info
    const studentQuery = `
      SELECT id, first_name, last_name, email, avatar_url
      FROM users
      WHERE id = $1
    `;
    const studentResult = await query(studentQuery, [student_id]);

    // Get cohort info if provided
    let cohortInfo = null;
    if (finalCohortId) {
      const cohortQuery = `
        SELECT code, level
        FROM cohorts
        WHERE id = $1
      `;
      const cohortResult = await query(cohortQuery, [finalCohortId]);
      if (cohortResult.rows.length > 0) {
        cohortInfo = {
          code: cohortResult.rows[0].code,
          level: cohortResult.rows[0].level,
        };
      }
    }

    const taskResponse = {
      id: task.id,
      mentorId: task.mentor_id,
      studentId: task.student_id,
      cohortId: task.cohort_id, // This will have finalCohortId from the insert
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
      student: studentResult.rows[0] ? {
        id: studentResult.rows[0].id,
        firstName: studentResult.rows[0].first_name,
        lastName: studentResult.rows[0].last_name,
        email: studentResult.rows[0].email,
        avatarUrl: studentResult.rows[0].avatar_url,
      } : null,
      cohort: cohortInfo,
    };

    // Create activity feed entry
    try {
      await createTaskCreatedActivity({
        mentorId: mentorId,
        studentId: student_id,
        cohortId: finalCohortId || null,
        taskId: task.id,
        taskTitle: title.trim(),
        createdBy: mentorId,
      });
    } catch (activityError) {
      // Log error but don't fail the request
      console.error('📰 [MENTOR TASKS] Failed to create activity feed entry:', activityError);
    }

    console.log('📋 [MENTOR TASKS] ✅ Task created:', task.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          task: taskResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📋 [MENTOR TASKS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create task' 
      },
      { status: 500 }
    );
  }
}
