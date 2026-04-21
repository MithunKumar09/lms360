/**
 * Vendor Event Registrations API Route
 * 
 * GET /api/vendor/events/[id]/registrations - Get registered students for a specific event
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by registration status (registered, cancelled, attended, no_show)
 * - paymentStatus: Filter by payment status (pending, paid, refunded)
 * - search: Search in student name/email
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorEventRegistrations } from '@/lib/db/vendor/events.js';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || null;
    const paymentStatus = searchParams.get('paymentStatus') || null;
    const search = searchParams.get('search') || null;

    // Get event registrations
    const result = await getVendorEventRegistrations(vendorId, eventId, {
      page,
      limit,
      status,
      paymentStatus,
      search,
    });

    return NextResponse.json({
      success: true,
      event: result.event,
      registrations: result.registrations,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    
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
        error: error.message || 'Failed to fetch event registrations',
      },
      { status: error.status || 500 }
    );
  }
}
