/**
 * Virtual Internship Enrollment API Route
 * 
 * POST /api/virtual-internships/[id]/enroll - Enroll/apply to program (student only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  createVirtualInternshipEnrollment,
  getVirtualInternshipEnrollment,
} from '@/lib/db/virtual-internships/enrollments.js';
import { getVirtualInternshipProgram } from '@/lib/db/virtual-internships/programs.js';

export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['student']);
    const userId = session.user.id;
    const programId = params.id;

    // Check if program exists and is published
    const program = await getVirtualInternshipProgram(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    if (program.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Program is not available for enrollment' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await getVirtualInternshipEnrollment(programId, userId);
    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Already enrolled in this program' },
        { status: 400 }
      );
    }

    // Create enrollment
    const enrollment = await createVirtualInternshipEnrollment(programId, userId, 'applied');

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        programId: enrollment.program_id,
        studentId: enrollment.student_id,
        enrollmentStatus: enrollment.enrollment_status,
        enrolledAt: enrollment.enrolled_at,
        createdAt: enrollment.created_at,
        updatedAt: enrollment.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Enroll POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enroll in program',
      },
      { status: error.status || 500 }
    );
  }
}
