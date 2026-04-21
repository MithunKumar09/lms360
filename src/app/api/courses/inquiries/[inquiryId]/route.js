/**
 * Course Inquiry Management API Route (Admin/Superadmin)
 * 
 * GET /api/courses/inquiries/:inquiryId - Get single inquiry
 * PUT /api/courses/inquiries/:inquiryId - Update inquiry status
 * DELETE /api/courses/inquiries/:inquiryId - Delete inquiry
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getInquiryById, updateInquiryStatus, deleteInquiry } from '@/lib/db/courses/inquiries.js';

/**
 * GET /api/courses/inquiries/:inquiryId
 * 
 * Get a single inquiry (admin/superadmin only)
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

    const { inquiryId } = params;
    const inquiry = await getInquiryById(inquiryId);

    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: 'Inquiry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      inquiry: {
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
      }
    });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch inquiry'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses/inquiries/:inquiryId
 * 
 * Update inquiry status (admin/superadmin only)
 * Body: { status }
 */
export async function PUT(request, { params }) {
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

    const { inquiryId } = params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['new', 'read', 'replied', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const inquiry = await updateInquiryStatus(inquiryId, status);

    return NextResponse.json({
      success: true,
      inquiry: {
        id: inquiry.id,
        courseId: inquiry.course_id,
        name: inquiry.name,
        email: inquiry.email,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.created_at,
        updatedAt: inquiry.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update inquiry'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/inquiries/:inquiryId
 * 
 * Delete an inquiry (admin/superadmin only)
 */
export async function DELETE(request, { params }) {
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

    const { inquiryId } = params;
    const deleted = await deleteInquiry(inquiryId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Inquiry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete inquiry'
      },
      { status: 500 }
    );
  }
}

