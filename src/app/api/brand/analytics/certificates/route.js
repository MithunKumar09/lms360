/**
 * Brand Certificate Analytics API Route
 * 
 * GET /api/brand/analytics/certificates - Get certificate analytics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandCertificateAnalytics } from '@/lib/db/brand/analytics.js';

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
    const analytics = await getBrandCertificateAnalytics(userId, {
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching brand certificate analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch certificate analytics',
      },
      { status: error.status || 500 }
    );
  }
}
