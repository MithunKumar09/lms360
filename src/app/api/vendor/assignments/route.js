/**
 * Vendor Assignments API Route
 * 
 * GET /api/vendor/assignments - List vendor's assignments
 * POST /api/vendor/assignments - Create assignment for vendor's course
 * 
 * Query Parameters (GET):
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - courseId: Filter by course ID
 * - status: Filter by status (draft, published, closed)
 * - search: Search in title
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getVendorAssignments,
  createVendorAssignment,
  getVendorCoursesForAssignment,
} from '@/lib/db/vendor/assignments.js';

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

    // Get vendor's assignments
    const result = await getVendorAssignments(vendorId, {
      page,
      limit,
      courseId,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      assignments: result.assignments,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching vendor assignments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignments',
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const {
      courseId,
      title,
      description,
      instructions,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxFileSizeMb,
      allowedFileTypes,
      status,
    } = body;

    // Validate required fields
    if (!courseId || !title || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'courseId, title, and dueDate are required' },
        { status: 400 }
      );
    }

    // Validate marks
    if (maxMarks && maxMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'maxMarks must be greater than 0' },
        { status: 400 }
      );
    }

    if (passingMarks && passingMarks < 0) {
      return NextResponse.json(
        { success: false, error: 'passingMarks must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    if (maxMarks && passingMarks && passingMarks > maxMarks) {
      return NextResponse.json(
        { success: false, error: 'passingMarks cannot be greater than maxMarks' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await createVendorAssignment(vendorId, {
      courseId,
      title,
      description,
      instructions,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxFileSizeMb,
      allowedFileTypes,
      status: status || 'draft',
    });

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error('Error creating vendor assignment:', error);
    
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
        error: error.message || 'Failed to create assignment',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/vendor/assignments/courses - Get vendor's courses for assignment creation
 */
export async function GET_COURSES(request) {
  try {
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

    const courses = await getVendorCoursesForAssignment(vendorId);

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error('Error fetching vendor courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch courses',
      },
      { status: error.status || 500 }
    );
  }
}
