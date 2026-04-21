/**
 * Superadmin Event Allocations API Route
 * 
 * GET /api/superadmin/brands/[id]/events/allocations - Get event college allocations
 * 
 * Note: The [id] parameter here refers to eventId, not brandId.
 * This route path follows the plan structure but may be confusing.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getEventCollegeAllocations } from '@/lib/db/brand/superadmin.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only superadmin
    await requireSuperadmin(request);

    // Note: [id] in the path is eventId, not brandId
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event ID is required',
        },
        { status: 400 }
      );
    }
    const { id: eventId } = params;

    // Get allocations
    const allocations = await getEventCollegeAllocations(eventId);

    return NextResponse.json({
      success: true,
      data: {
        allocations,
      },
    });
  } catch (error) {
    console.error('Error fetching event allocations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event allocations',
      },
      { status: error.status || 500 }
    );
  }
}
