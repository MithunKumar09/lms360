/**
 * Vendor All Event Registrations API Route
 * 
 * GET /api/vendor/events/registrations - Get all event registrations across vendor's events
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - eventId: Filter by specific event (optional)
 * - status: Filter by registration status (optional)
 * - search: Search in student name/email or event title
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorAllEventRegistrations } from '@/lib/db/vendor/events.js';

export async function GET(request) {
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
    
    const vendorId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const eventId = searchParams.get('eventId') || null;
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;

    // Get all event registrations
    const result = await getVendorAllEventRegistrations(vendorId, {
      page,
      limit,
      eventId,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      registrations: result.registrations,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching vendor event registrations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event registrations',
      },
      { status: error.status || 500 }
    );
  }
}
