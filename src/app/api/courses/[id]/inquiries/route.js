/**
 * Course Inquiries Management API Route (Admin/Superadmin)
 * 
 * GET /api/courses/:id/inquiries - Get inquiries for a course
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getCourseInquiries, getInquiryStatistics } from '@/lib/db/courses/inquiries.js';

/**
 * GET /api/courses/:id/inquiries
 * 
 * Get inquiries for a course (admin/superadmin only)
 * Query params: status, page, limit
 */
export async function GET(request, { params }) {
  try {
    // Check authentication and authorization
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    if (userRole !== 'superadmin' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id: courseId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination params
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

    // Get inquiries
    const data = await getCourseInquiries(courseId, status, page, limit);
    
    // Get statistics
    const statistics = await getInquiryStatistics(courseId);

    // Transform inquiries for response
    const transformedInquiries = data.inquiries.map(inquiry => ({
      id: inquiry.id,
      courseId: inquiry.course_id,
      courseTitle: inquiry.course_title,
      courseSlug: inquiry.course_slug,
      name: inquiry.name,
      email: inquiry.email,
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.created_at,
      updatedAt: inquiry.updated_at
    }));

    return NextResponse.json({
      success: true,
      inquiries: transformedInquiries,
      pagination: data.pagination,
      statistics
    });
  } catch (error) {
    console.error('Error fetching course inquiries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch inquiries'
      },
      { status: 500 }
    );
  }
}

