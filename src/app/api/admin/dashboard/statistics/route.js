/**
 * Admin Dashboard Statistics API Route
 * 
 * GET /api/admin/dashboard/statistics - Get comprehensive admin dashboard statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getAdminDashboardStatistics } from '@/lib/db/admin/statistics.js';

export async function GET(request) {
  try {
    // Authentication: Only admins
    const session = await requireRole(request, ['admin']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const adminId = session.user.id;
    const orgId = session.user.orgId || session.user.org_id;

    // Get dashboard statistics
    const statistics = await getAdminDashboardStatistics(adminId, orgId);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      },
      { status: error.status || 500 }
    );
  }
}
