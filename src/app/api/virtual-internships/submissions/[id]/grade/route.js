/**
 * Virtual Internship Submission Grading API Route
 * 
 * PUT /api/virtual-internships/submissions/[id]/grade - Grade submission (company only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getVirtualInternshipSubmission,
  gradeVirtualInternshipSubmission,
} from '@/lib/db/virtual-internships/submissions.js';
import { getVirtualInternshipTask } from '@/lib/db/virtual-internships/tasks.js';
import { getVirtualInternshipProgram } from '@/lib/db/virtual-internships/programs.js';

export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const submissionId = params.id;

    const submission = await getVirtualInternshipSubmission(submissionId);
    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    // Verify program belongs to company
    const program = await getVirtualInternshipProgram(submission.programId);
    if (!program || program.companyUserId !== userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { marksObtained, feedback, status = 'graded' } = body;

    if (marksObtained !== null && marksObtained !== undefined) {
      if (marksObtained < 0 || marksObtained > submission.maxMarks) {
        return NextResponse.json(
          { success: false, error: `Marks must be between 0 and ${submission.maxMarks}` },
          { status: 400 }
        );
      }
    }

    const graded = await gradeVirtualInternshipSubmission(submissionId, {
      marksObtained,
      feedback,
      status,
      gradedBy: userId,
    });

    return NextResponse.json({ success: true, submission: graded });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Grade] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to grade' }, { status: error.status || 500 });
  }
}
