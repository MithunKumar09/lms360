/**
 * Superadmin Dashboard Analytics API Route
 * 
 * GET /api/superadmin/dashboard/analytics - Get superadmin analytics data for charts
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getSuperadminMonthlyTrends, getSuperadminDistribution } from '@/lib/db/superadmin/statistics.js';

/**
 * GET /api/superadmin/dashboard/analytics
 * 
 * Get superadmin analytics data for charts
 * Query params: 
 *   - type: 'trends' or 'distribution'
 *   - metric: For trends - 'enrollments', 'courses', or 'students'
 *   - period: For trends - '12months', '6months', or '3months' (default: '12months')
 *   - distributionType: For distribution - 'course_categories', 'enrollment_status', or 'course_status'
 *   - categoryId: Optional filter for line chart (matches dropdown in UI)
 *   - timePeriod: Optional filter for pie chart (matches dropdown in UI)
 */
export async function GET(request) {
  try {
    // Check authentication and authorization
    const session = await requireRole(request, ['superadmin']);

    const superadminId = session?.user?.id;
    
    if (!superadminId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trends';
    const metric = searchParams.get('metric') || 'enrollments';
    const period = searchParams.get('period') || '12months';
    const distributionType = searchParams.get('distributionType') || 'course_categories';
    const categoryId = searchParams.get('categoryId') || null;
    const timePeriod = searchParams.get('timePeriod') || null;

    if (type === 'trends') {
      // Get monthly trends
      const data = await getSuperadminMonthlyTrends(superadminId, metric, period, categoryId);
      
      return NextResponse.json({
        success: true,
        type: 'trends',
        metric,
        period,
        categoryId,
        data,
      });
    } else if (type === 'distribution') {
      // Get distribution data
      const data = await getSuperadminDistribution(superadminId, distributionType, timePeriod);
      
      return NextResponse.json({
        success: true,
        type: 'distribution',
        distributionType,
        timePeriod,
        data,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "trends" or "distribution"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching superadmin analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics'
      },
      { status: 500 }
    );
  }
}
