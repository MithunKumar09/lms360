/**
 * Brand Event Analytics API Route
 * 
 * GET /api/brand/analytics/events - Get event analytics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandEventAnalytics } from '@/lib/db/brand/analytics.js';

export async function GET(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

    // Get analytics
    const analytics = await getBrandEventAnalytics(userId, {
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching brand event analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event analytics',
      },
      { status: error.status || 500 }
    );
  }
}
