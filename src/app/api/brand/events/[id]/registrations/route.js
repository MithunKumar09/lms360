/**
 * Brand Event Registrations API Route
 * 
 * GET /api/brand/events/[id]/registrations - Get event registrations
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandEventRegistrations } from '@/lib/db/brand/registrations.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: eventId } = params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || null;
    const paymentStatus = searchParams.get('paymentStatus') || null;
    const search = searchParams.get('search') || null;

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

    // Get registrations
    const data = await getBrandEventRegistrations(userId, eventId, {
      page,
      limit,
      status,
      paymentStatus,
      search,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching brand event registrations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch registrations',
      },
      { status: error.status || 500 }
    );
  }
}
