/**
 * Vendor Enrolled Students API Route
 * 
 * GET /api/vendor/enrollments/students - Get all enrolled students across vendor's courses
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - courseId: Filter by specific course (optional)
 * - status: Filter by enrollment status (active, completed, dropped, suspended)
 * - search: Search in student name/email
 * - minProgress: Minimum progress percentage (0-100)
 * - maxProgress: Maximum progress percentage (0-100)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorEnrolledStudents } from '@/lib/db/vendor/enrollments.js';

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
    const courseId = searchParams.get('courseId') || null;
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;
    const minProgress = searchParams.get('minProgress') ? parseFloat(searchParams.get('minProgress')) : null;
    const maxProgress = searchParams.get('maxProgress') ? parseFloat(searchParams.get('maxProgress')) : null;

    // Validate progress range
    if (minProgress !== null && (minProgress < 0 || minProgress > 100)) {
      return NextResponse.json(
        { success: false, error: 'minProgress must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (maxProgress !== null && (maxProgress < 0 || maxProgress > 100)) {
      return NextResponse.json(
        { success: false, error: 'maxProgress must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (minProgress !== null && maxProgress !== null && minProgress > maxProgress) {
      return NextResponse.json(
        { success: false, error: 'minProgress cannot be greater than maxProgress' },
        { status: 400 }
      );
    }

    // Get enrolled students
    const result = await getVendorEnrolledStudents(vendorId, {
      page,
      limit,
      courseId,
      status,
      search,
      minProgress,
      maxProgress,
    });

    return NextResponse.json({
      success: true,
      students: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching vendor enrolled students:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch enrolled students',
      },
      { status: error.status || 500 }
    );
  }
}
