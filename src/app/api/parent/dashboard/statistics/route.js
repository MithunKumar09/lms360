/**
 * Parent Dashboard Statistics API Route
 * 
 * GET /api/parent/dashboard/statistics - Get comprehensive parent dashboard statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getParentDashboardStatistics, verifyParentStudentRelationship } from '@/lib/db/parent/statistics.js';

export async function GET(request) {
  try {
    // Authentication: Only parents
    const session = await requireRole(request, ['parent']);
    const parentId = session.user.id;
    const orgId = session.user.orgId;

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parent must be associated with an organization',
        },
        { status: 400 }
      );
    }

    // Verify parent has at least one linked child
    const relationships = await verifyParentStudentRelationship(parentId);
    if (!relationships || relationships.length === 0) {
      return NextResponse.json({
        success: true,
        statistics: {
          linkedChildren: 0,
          activeEnrollments: 0,
          completedCourses: 0,
          achievementsEarned: 0,
        },
      });
    }

    // Get dashboard statistics
    const statistics = await getParentDashboardStatistics(parentId, orgId);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('Error fetching parent dashboard statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      },
      { status: error.status || 500 }
    );
  }
}
