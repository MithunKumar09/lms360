/**
 * Virtual Internship Tasks API Route
 * 
 * GET /api/virtual-internships/[id]/tasks - List tasks in program
 * POST /api/virtual-internships/[id]/tasks - Create task (company only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  listVirtualInternshipTasks,
  createVirtualInternshipTask,
} from '@/lib/db/virtual-internships/tasks.js';
import { hasAccessToProgram } from '@/lib/db/virtual-internships/programs.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const programId = params.id;

    // Check access
    const hasAccess = await hasAccessToProgram(programId, userId, userRole);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;

    const tasks = await listVirtualInternshipTasks(programId, { status });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Tasks GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tasks',
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const programId = params.id;

    // Verify program belongs to company
    const hasAccess = await hasAccessToProgram(programId, userId, 'company');
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!body.dueDate) {
      return NextResponse.json(
        { success: false, error: 'Due date is required' },
        { status: 400 }
      );
    }

    const task = await createVirtualInternshipTask({
      programId,
      createdBy: userId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      instructions: body.instructions?.trim() || null,
      maxMarks: body.maxMarks || 100,
      passingMarks: body.passingMarks || 50,
      dueDate: body.dueDate,
      allowLateSubmission: body.allowLateSubmission || false,
      lateSubmissionPenalty: body.lateSubmissionPenalty || 0,
      maxFileSizeMb: body.maxFileSizeMb || 10,
      allowedFileTypes: body.allowedFileTypes || [],
      status: body.status || 'draft',
      orderIndex: body.orderIndex || 0,
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        programId: task.program_id,
        createdBy: task.created_by,
        title: task.title,
        description: task.description,
        instructions: task.instructions,
        maxMarks: parseFloat(task.max_marks),
        passingMarks: parseFloat(task.passing_marks),
        dueDate: task.due_date,
        allowLateSubmission: task.allow_late_submission,
        lateSubmissionPenalty: parseFloat(task.late_submission_penalty),
        maxFileSizeMb: task.max_file_size_mb,
        allowedFileTypes: task.allowed_file_types || [],
        status: task.status,
        orderIndex: task.order_index,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Tasks POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create task',
      },
      { status: error.status || 500 }
    );
  }
}
