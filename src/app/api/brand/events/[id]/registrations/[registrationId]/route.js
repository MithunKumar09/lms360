/**
 * Brand Event Registration Update API Route
 * 
 * PUT /api/brand/events/[id]/registrations/[registrationId] - Update registration status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { updateBrandRegistrationStatus } from '@/lib/db/brand/registrations.js';

export async function PUT(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: eventId, registrationId } = params;

    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'status is required',
        },
        { status: 400 }
      );
    }

    // Valid statuses
    const validStatuses = ['registered', 'cancelled', 'attended', 'no_show'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Update registration status
    const registration = await updateBrandRegistrationStatus(userId, registrationId, status);

    return NextResponse.json({
      success: true,
      data: {
        registration,
      },
    });
  } catch (error) {
    console.error('Error updating brand registration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update registration',
      },
      { status: error.status || 500 }
    );
  }
}
