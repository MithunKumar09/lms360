/**
 * Vendor Dashboard Analytics API Route
 * 
 * GET /api/vendor/dashboard/analytics - Get vendor analytics data for charts
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorMonthlyTrends, getVendorDistribution } from '@/lib/db/vendor/statistics.js';

/**
 * GET /api/vendor/dashboard/analytics
 * 
 * Get vendor analytics data for charts
 * Query params: 
 *   - type: 'trends' or 'distribution'
 *   - metric: For trends - 'enrollments', 'registrations', or 'revenue'
 *   - distributionType: For distribution - 'enrollment_status', 'revenue_sources', or 'course_distribution'
 */
export async function GET(request) {
  try {
    // Check authentication and authorization
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }

    const vendorId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trends';
    const metric = searchParams.get('metric') || 'enrollments';
    const distributionType = searchParams.get('distributionType') || 'enrollment_status';

    if (type === 'trends') {
      // Get monthly trends
      const data = await getVendorMonthlyTrends(vendorId, metric);
      
      return NextResponse.json({
        success: true,
        type: 'trends',
        metric,
        data,
      });
    } else if (type === 'distribution') {
      // Get distribution data
      const data = await getVendorDistribution(vendorId, distributionType);
      
      return NextResponse.json({
        success: true,
        type: 'distribution',
        distributionType,
        data,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "trends" or "distribution"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics'
      },
      { status: 500 }
    );
  }
}
