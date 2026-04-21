/**
 * Brand Event Proposal API Route
 * 
 * POST /api/brand/events/[id]/propose - Submit event for superadmin approval
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canManageEvent } from '@/lib/auth/brandPermissions.js';
import { proposeBrandEvent } from '@/lib/db/brand/events.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: eventId } = params;

    // Check permission
    const hasPermission = await canManageEvent(session.user.role, userId, eventId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You do not have permission to propose this event',
        },
        { status: 403 }
      );
    }

    // Propose event (changes status from 'draft' to 'proposed')
    const event = await proposeBrandEvent(eventId, userId);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found, already proposed, or you do not have permission',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        event,
      },
      message: 'Event submitted for approval',
    });
  } catch (error) {
    console.error('Error proposing brand event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to propose event',
      },
      { status: error.status || 500 }
    );
  }
}
