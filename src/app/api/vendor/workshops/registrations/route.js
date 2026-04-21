/**
 * Vendor All Workshop Registrations API Route
 * 
 * GET /api/vendor/workshops/registrations - Get all workshop registrations across vendor's workshops
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - workshopId: Filter by specific workshop (optional)
 * - status: Filter by registration status (optional)
 * - search: Search in student name/email or workshop title
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorAllWorkshopRegistrations } from '@/lib/db/vendor/workshops.js';

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
    const workshopId = searchParams.get('workshopId') || null;
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;

    // Get all workshop registrations
    const result = await getVendorAllWorkshopRegistrations(vendorId, {
      page,
      limit,
      workshopId,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      registrations: result.registrations,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching vendor workshop registrations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch workshop registrations',
      },
      { status: error.status || 500 }
    );
  }
}
