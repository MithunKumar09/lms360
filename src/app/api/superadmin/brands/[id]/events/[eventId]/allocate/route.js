/**
 * Superadmin Event Allocation API Route
 * 
 * POST /api/superadmin/brands/[id]/events/[eventId]/allocate - Allocate event to colleges
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { allocateEventToColleges } from '@/lib/db/brand/superadmin.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

    if (!params || !params.id || !params.eventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand ID and Event ID are required',
        },
        { status: 400 }
      );
    }
    const { id: brandId, eventId } = params;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { orgIds } = body;

    if (!orgIds || !Array.isArray(orgIds) || orgIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'orgIds array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Allocate event to colleges
    const allocations = await allocateEventToColleges(eventId, orgIds, userId);

    return NextResponse.json({
      success: true,
      data: {
        allocations,
      },
    });
  } catch (error) {
    console.error('Error allocating event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to allocate event',
      },
      { status: error.status || 500 }
    );
  }
}
