/**
 * Brand Dashboard Analytics API Route
 * 
 * GET /api/brand/dashboard/analytics - Get brand analytics data for charts
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandMonthlyTrends, getBrandDistribution } from '@/lib/db/brand/statistics.js';

/**
 * GET /api/brand/dashboard/analytics
 * 
 * Get brand analytics data for charts
 * Query params: 
 *   - type: 'trends' or 'distribution'
 *   - metric: For trends - 'events', 'registrations', or 'certificates'
 *   - distributionType: For distribution - 'event_status', 'certificate_status', or 'event_types'
 */
export async function GET(request) {
  try {
    // Check authentication and authorization
    const session = await requireRole(request, ['brand']);

    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trends';
    const metric = searchParams.get('metric') || 'events';
    const distributionType = searchParams.get('distributionType') || 'event_status';

    if (type === 'trends') {
      // Get monthly trends
      const data = await getBrandMonthlyTrends(userId, metric);
      
      return NextResponse.json({
        success: true,
        type: 'trends',
        metric,
        data,
      });
    } else if (type === 'distribution') {
      // Get distribution data
      const data = await getBrandDistribution(userId, distributionType);
      
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
    console.error('Error fetching brand analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics'
      },
      { status: 500 }
    );
  }
}

