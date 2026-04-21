/**
 * Vendor Event Statistics API Route
 * 
 * GET /api/vendor/events/[id]/statistics - Get event registration statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getEventRegistrationStats } from '@/lib/db/vendor/events.js';

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
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const eventId = params.id;

    // Get event statistics
    const stats = await getEventRegistrationStats(vendorId, eventId);

    return NextResponse.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error('Error fetching event statistics:', error);
    
    // Handle event not found or access denied
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
        error: error.message || 'Failed to fetch event statistics',
      },
      { status: error.status || 500 }
    );
  }
}
