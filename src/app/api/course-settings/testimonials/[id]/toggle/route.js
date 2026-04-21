/**
 * Toggle Testimonial Status API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import { toggleTestimonialStatus } from '@/lib/db/course-settings/testimonials.js';

export async function PATCH(request, { params }) {
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
    const testimonial = await toggleTestimonialStatus(id, orgId);

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: testimonial,
        message: `Testimonial ${testimonial.status === 1 ? 'activated' : 'deactivated'} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/course-settings/testimonials/[id]/toggle:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle testimonial status' },
      { status: 500 }
    );
  }
}

