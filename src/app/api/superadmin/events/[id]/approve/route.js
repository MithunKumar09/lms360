/**
 * Superadmin Event Approval API Route
 * 
 * POST /api/superadmin/events/[id]/approve - Approve or reject event proposal
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { approveOrRejectEvent } from '@/lib/db/brand/events.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const superadminId = session.user.id;

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
    const { action } = body;

    // Validate action
    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required and must be either "approve" or "reject"',
        },
        { status: 400 }
      );
    }

    // Approve or reject event
    const event = await approveOrRejectEvent(eventId, action, superadminId);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found or is not in proposed status',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        event,
      },
      message: `Event ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error approving/rejecting event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update event status',
      },
      { status: error.status || 500 }
    );
  }
}
