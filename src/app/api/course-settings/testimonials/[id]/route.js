/**
 * Testimonial by ID API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
} from '@/lib/db/course-settings/testimonials.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.testimonials, 'read');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid testimonial ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const testimonial = await getTestimonialById(id, orgId);

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: testimonial }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/course-settings/testimonials/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get testimonial' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.testimonials, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid testimonial ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { student_name, photo_url, course_id, rating, message, status } = body;

    const updateData = {};
    if (student_name !== undefined) {
      if (!student_name || typeof student_name !== 'string' || student_name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Student name cannot be empty', errors: { student_name: 'Student name is required' } },
          { status: 400 }
        );
      }
      updateData.student_name = student_name.trim();
    }
    if (photo_url !== undefined) updateData.photo_url = photo_url || null;
    if (course_id !== undefined) updateData.course_id = course_id || null;
    if (rating !== undefined) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json(
          { success: false, error: 'Rating must be between 1 and 5', errors: { rating: 'Invalid rating value' } },
          { status: 400 }
        );
      }
      updateData.rating = parseInt(rating, 10);
    }
    if (message !== undefined) {
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Testimonial message cannot be empty', errors: { message: 'Testimonial message is required' } },
          { status: 400 }
        );
      }
      updateData.message = message.trim();
    }
    if (status !== undefined) {
      if (status !== 0 && status !== 1) {
        return NextResponse.json(
          { success: false, error: 'Status must be 0 or 1', errors: { status: 'Invalid status value' } },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const testimonial = await updateTestimonial(id, updateData, orgId);

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: testimonial, message: 'Testimonial updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/testimonials/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.testimonials, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid testimonial ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const deleted = await deleteTestimonial(id, orgId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Testimonial deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/course-settings/testimonials/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}

