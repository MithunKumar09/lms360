/**
 * Vendor Dashboard Statistics API Route
 * 
 * GET /api/vendor/dashboard/statistics - Get comprehensive vendor dashboard statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorDashboardStatistics } from '@/lib/db/vendor/statistics.js';

export async function GET(request) {
  try {
    // Authentication: Only vendors
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

    // Get dashboard statistics
    const statistics = await getVendorDashboardStatistics(vendorId);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('Error fetching vendor dashboard statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      },
      { status: error.status || 500 }
    );
  }
}
