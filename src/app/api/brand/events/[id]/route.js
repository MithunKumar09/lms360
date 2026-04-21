/**
 * Brand Event Details API Route
 * 
 * GET /api/brand/events/[id] - Get brand event by ID
 * PUT /api/brand/events/[id] - Update brand event
 * DELETE /api/brand/events/[id] - Delete brand event
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canManageEvent } from '@/lib/auth/brandPermissions.js';
import { getBrandEvent, updateBrandEvent, deleteBrandEvent } from '@/lib/db/brand/events.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: eventId } = params;

    // Get event
    const event = await getBrandEvent(eventId, userId);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Error fetching brand event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event',
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request, { params }) {
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
          error: 'Access denied: You do not have permission to manage this event',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Update event
    const event = await updateBrandEvent(eventId, userId, body);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found or you do not have permission to update it',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Error updating brand event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update event',
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
          error: 'Access denied: You do not have permission to delete this event',
        },
        { status: 403 }
      );
    }

    // Delete event
    const deleted = await deleteBrandEvent(eventId, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found or you do not have permission to delete it',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting brand event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete event',
      },
      { status: error.status || 500 }
    );
  }
}
