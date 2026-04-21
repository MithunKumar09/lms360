/**
 * Superadmin Brand Event Allocation API Route
 * 
 * POST /api/superadmin/brands/[id]/events/allocate - Allocate event to colleges
 * 
 * Note: The [id] parameter here refers to eventId, not brandId.
 * This route path follows the plan structure but may be confusing.
 * Consider refactoring to /api/superadmin/events/[id]/allocate in the future.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { allocateEventToColleges, getEventCollegeAllocations } from '@/lib/db/brand/superadmin.js';
import { query } from '@/lib/db/index.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const superadminId = session.user.id;

    // Note: The route path is /superadmin/brands/[id]/events/allocate
    // but [id] here refers to eventId, not brandId
    // This is a bit confusing but matches the plan structure
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
    const { org_ids } = body;

    // Validate required fields
    if (!org_ids || !Array.isArray(org_ids) || org_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_ids array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Verify event exists and is approved
    const eventQuery = `
      SELECT id, status, brand_id
      FROM events
      WHERE id = $1
    `;
    const eventResult = await query(eventQuery, [eventId]);
    if (eventResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    const event = eventResult.rows[0];
    if (event.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'Event must be approved before allocating to colleges',
        },
        { status: 400 }
      );
    }

    // Verify organizations exist
    const orgsQuery = `
      SELECT id FROM organizations WHERE id = ANY($1::uuid[])
    `;
    const orgsResult = await query(orgsQuery, [org_ids]);
    if (orgsResult.rows.length !== org_ids.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'One or more organizations not found',
        },
        { status: 400 }
      );
    }

    // Allocate event to colleges
    const allocations = await allocateEventToColleges(eventId, org_ids, superadminId);

    // Get all allocations for this event
    const allAllocations = await getEventCollegeAllocations(eventId);

    return NextResponse.json({
      success: true,
      data: {
        allocations: allAllocations,
      },
      message: `Event allocated to ${allocations.length} college(s)`,
    });
  } catch (error) {
    console.error('Error allocating event to colleges:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to allocate event to colleges',
      },
      { status: error.status || 500 }
    );
  }
}
