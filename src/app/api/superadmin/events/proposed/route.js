/**
 * Superadmin Proposed Events API Route
 * 
 * GET /api/superadmin/events/proposed - Get all proposed events for approval
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getProposedEvents } from '@/lib/db/brand/events.js';

export async function GET(request) {
  try {
    // Authentication: Only superadmin
    await requireSuperadmin(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate pagination
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get proposed events
    const data = await getProposedEvents({ page, limit });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching proposed events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch proposed events',
      },
      { status: error.status || 500 }
    );
  }
}
