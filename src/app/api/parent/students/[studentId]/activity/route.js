/**
 * Parent Student Activity API Route
 * 
 * GET /api/parent/students/[studentId]/activity - Get student activity log and engagement stats
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canViewActivityLog, getParentAccessSettings, getParentStudentLinkPermissions } from '@/lib/auth/parentPermissions.js';
import { verifyParentAccessToStudent } from '@/lib/db/parent/students.js';
import { getStudentDailyActivity, getStudentEngagementStats } from '@/lib/db/parent/activity.js';

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
    const hasActivityLogPermission = await canViewActivityLog(session.user.role, parentId, studentId, orgId);
    
    // Check engagement stats separately (uses same logic but different field)
    const linkPermissions = await getParentStudentLinkPermissions(parentId, studentId, orgId);
    const accessSettings = await getParentAccessSettings(parentId, studentId, orgId);
    const canViewEngagementStats = linkPermissions?.can_view_engagement_stats !== false && accessSettings.can_view_engagement_stats;

    if (!hasActivityLogPermission && !canViewEngagementStats) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Activity and engagement view is disabled for this parent',
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'week'; // week, month, all

    // Get activity data
    const dailyLog = hasActivityLogPermission
      ? await getStudentDailyActivity(studentId, timeRange)
      : [];

    // Get engagement stats
    const engagement = canViewEngagementStats
      ? await getStudentEngagementStats(studentId, timeRange)
      : {};

    return NextResponse.json({
      success: true,
      activity: {
        dailyLog,
      },
      engagement,
    });
  } catch (error) {
    console.error('Error fetching student activity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch student activity',
      },
      { status: error.status || 500 }
    );
  }
}
