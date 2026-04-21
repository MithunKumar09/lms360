/**
 * Vendor Course Enrollment Details API Route
 * 
 * GET /api/vendor/courses/[id]/enrollments - Get enrolled students for a specific course
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by enrollment status (active, completed, dropped, suspended)
 * - search: Search in student name/email
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getCourseEnrolledStudents } from '@/lib/db/vendor/enrollments.js';

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
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const courseId = params.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;

    // Get enrolled students for the course
    const result = await getCourseEnrolledStudents(vendorId, courseId, {
      page,
      limit,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      students: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching course enrolled students:', error);
    
    // Handle course not found or access denied
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
        error: error.message || 'Failed to fetch enrolled students',
      },
      { status: error.status || 500 }
    );
  }
}
