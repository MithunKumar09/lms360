/**
 * Student Tasks API Route
 * 
 * GET /api/students/tasks - List tasks assigned to student
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/students/tasks
 * List tasks assigned to student with optional filters
 * 
 * Query Parameters:
 * - mentor_id: Filter by mentor
 * - status: Filter by status (pending, in_progress, completed, overdue, cancelled)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request) {
  try {
    console.log('📋 [STUDENT TASKS] ===== GET TASKS STARTED =====');
    
    // Require student role
    const session = await requireRole(request, ['student']);
    const studentId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const mentorId = searchParams.get('mentor_id') || null;
    const statusParam = searchParams.get('status');
    // Handle 'null' string or actual null - treat both as no filter
    const status = statusParam && statusParam !== 'null' && statusParam !== 'all' ? statusParam : null;

    // Build WHERE conditions
    const whereConditions = ['mt.student_id = $1'];
    const queryParams = [studentId];
    let paramIndex = 2;

    // Filter by mentor
    if (mentorId) {
      whereConditions.push(`mt.mentor_id = $${paramIndex}`);
      queryParams.push(mentorId);
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

    // Get tasks with mentor and cohort info
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
        u.id as mentor_user_id,
        u.first_name as mentor_first_name,
        u.last_name as mentor_last_name,
        u.email as mentor_email,
        u.avatar_url as mentor_avatar_url,
        c.code as cohort_code,
        c.level as cohort_level
      FROM mentor_tasks mt
      INNER JOIN users u ON mt.mentor_id = u.id
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
      mentor: {
        id: row.mentor_user_id,
        firstName: row.mentor_first_name,
        lastName: row.mentor_last_name,
        email: row.mentor_email,
        avatarUrl: row.mentor_avatar_url,
      },
      cohort: row.cohort_code ? {
        code: row.cohort_code,
        level: row.cohort_level,
      } : null,
    }));

    console.log('📋 [STUDENT TASKS] ✅ Tasks fetched:', tasks.length);

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
    console.error('📋 [STUDENT TASKS] ❌ Error:', error);
    
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
