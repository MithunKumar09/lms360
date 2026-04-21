/**
 * Parent Student Engagement API Route
 * 
 * GET /api/parent/students/[studentId]/engagement - Get student engagement statistics
 * 
 * Note: This endpoint is separate from activity for API clarity, but both endpoints
 * can be called together. The activity endpoint also returns engagement data.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getParentAccessSettings, getParentStudentLinkPermissions } from '@/lib/auth/parentPermissions.js';
import { verifyParentAccessToStudent } from '@/lib/db/parent/students.js';
import { getStudentEngagementStats } from '@/lib/db/parent/activity.js';

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

    // Check access permissions using integrated permission system
    const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
    const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
    const canViewEngagementStats = linkPermissions?.can_view_engagement_stats !== false && accessSettings.can_view_engagement_stats;
    
    if (!canViewEngagementStats) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Engagement statistics view is disabled for this parent',
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'week'; // week, month, all

    // Get engagement stats
    const engagement = await getStudentEngagementStats(studentId, timeRange);

    return NextResponse.json({
      success: true,
      engagement,
    });
  } catch (error) {
    console.error('Error fetching student engagement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch student engagement',
      },
      { status: error.status || 500 }
    );
  }
}
