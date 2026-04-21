/**
 * Brand Dashboard Statistics API Route
 * 
 * GET /api/brand/dashboard/statistics - Get comprehensive brand dashboard statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandDashboardStatistics } from '@/lib/db/brand/statistics.js';

export async function GET(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const brandId = session.user.id;

    // Get dashboard statistics
    const statistics = await getBrandDashboardStatistics(brandId);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('Error fetching brand dashboard statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      },
      { status: error.status || 500 }
    );
  }
}
