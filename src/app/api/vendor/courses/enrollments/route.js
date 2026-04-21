/**
 * Vendor Course Enrollments API Route
 * 
 * GET /api/vendor/courses/enrollments - Get vendor's courses with enrollment statistics
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 12)
 * - status: Filter by course status (draft, published, archived, suspended)
 * - search: Search in course title
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorCourseEnrollments } from '@/lib/db/vendor/enrollments.js';

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
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;

    // Get vendor's courses with enrollment statistics
    const result = await getVendorCourseEnrollments(vendorId, {
      page,
      limit,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      courses: result.courses,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching vendor course enrollments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch course enrollments',
      },
      { status: error.status || 500 }
    );
  }
}
