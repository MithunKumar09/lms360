/**
 * Virtual Internship Task Submissions API Route
 * 
 * GET /api/virtual-internships/tasks/[taskId]/submissions - List submissions for task (company only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  listTaskSubmissions,
} from '@/lib/db/virtual-internships/submissions.js';
import { getVirtualInternshipTask, hasAccessToTask } from '@/lib/db/virtual-internships/tasks.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const taskId = params.taskId;

    // Verify access
    const hasAccess = await hasAccessToTask(taskId, userId, 'company');
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Task not found or access denied' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;

    const submissions = await listTaskSubmissions(taskId, { status });

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Task Submissions GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch submissions' }, { status: error.status || 500 });
  }
}
