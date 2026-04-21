/**
 * Testimonials API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  createTestimonial,
  listTestimonials,
} from '@/lib/db/course-settings/testimonials.js';

export async function GET(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.testimonials, 'read');
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      org_id: userRole === 'admin' ? session.user.orgId : searchParams.get('org_id') || null,
      course_id: searchParams.get('course_id') || undefined,
      status: searchParams.get('status') ? parseInt(searchParams.get('status'), 10) : undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating'), 10) : undefined,
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    const result = await listTestimonials(filters);

    return NextResponse.json(
      {
        success: true,
        data: result.testimonials,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in GET /api/course-settings/testimonials:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.testimonials, 'write');
    }

    const body = await request.json();
    const { student_name, photo_url, course_id, rating, message, status } = body;

    if (!student_name || typeof student_name !== 'string' || student_name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student name is required',
          errors: { student_name: 'Student name is required' },
        },
        { status: 400 }
      );
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rating is required and must be between 1 and 5',
          errors: { rating: 'Rating must be between 1 and 5' },
        },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Testimonial message is required',
          errors: { message: 'Testimonial message is required' },
        },
        { status: 400 }
      );
    }

    let finalOrgId = null;
    if (userRole === 'superadmin') {
      finalOrgId = body.org_id || null;
    } else if (userRole === 'admin') {
      finalOrgId = session.user.orgId;
    }

    const testimonial = await createTestimonial({
      org_id: finalOrgId,
      student_name: student_name.trim(),
      photo_url: photo_url || null,
      course_id: course_id || null,
      rating: parseInt(rating, 10),
      message: message.trim(),
      status: status !== undefined ? status : 1,
      created_by: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: testimonial,
        message: 'Testimonial created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in POST /api/course-settings/testimonials:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}

