/**
 * Vendor Workshop Statistics API Route
 * 
 * GET /api/vendor/workshops/[id]/statistics - Get workshop registration statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getWorkshopRegistrationStats } from '@/lib/db/vendor/workshops.js';

export async function GET(request, { params }) {
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
    
    if (!params || !params.id) {
      return NextResponse.json(
        { success: false, error: 'Workshop ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const workshopId = params.id;

    // Get workshop statistics
    const stats = await getWorkshopRegistrationStats(vendorId, workshopId);

    return NextResponse.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error('Error fetching workshop statistics:', error);
    
    // Handle workshop not found or access denied
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch workshop statistics',
      },
      { status: error.status || 500 }
    );
  }
}
