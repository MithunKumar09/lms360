/**
 * Parent Student Progress API Route
 * 
 * GET /api/parent/students/[studentId]/progress - Get student progress overview
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { verifyParentStudentRelationship, canViewStudentProgress } from '@/lib/auth/parentPermissions.js';
import { verifyParentAccessToStudent } from '@/lib/db/parent/students.js';
import { getStudentProgressOverview } from '@/lib/db/parent/progress.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only parents
    const session = await requireRole(request, ['parent']);
    const parentId = session.user.id;
    const orgId = session.user.orgId;
    const { studentId } = params;

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parent must be associated with an organization',
        },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student ID is required',
        },
        { status: 400 }
      );
    }

    // Verify parent has access to this student
    const hasAccess = await verifyParentAccessToStudent(parentId, studentId, orgId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Student is not linked to this parent',
        },
        { status: 403 }
      );
    }

    // Check permission using integrated permission system
    const hasPermission = await canViewStudentProgress(session.user.role, parentId, studentId, orgId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Progress view is disabled for this parent',
        },
        { status: 403 }
      );
    }

    // Get student progress overview
    const progress = await getStudentProgressOverview(studentId, orgId);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch student progress',
      },
      { status: error.status || 500 }
    );
  }
}
