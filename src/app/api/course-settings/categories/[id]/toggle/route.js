/**
 * Toggle Category Status API Route
 * 
 * PATCH /api/course-settings/categories/[id]/toggle
 * Toggles category status between active (1) and inactive (0)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import { toggleCategoryStatus } from '@/lib/db/course-settings/categories.js';

export async function PATCH(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Check write access for admin
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.categories, 'write');
    }

    const { id } = params;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category ID format',
        },
        { status: 400 }
      );
    }

    // Get org_id filter for admin
    const orgId = userRole === 'admin' ? session.user.orgId : null;

    // Toggle status
    const category = await toggleCategoryStatus(id, orgId);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: `Category ${category.status === 1 ? 'activated' : 'deactivated'} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/course-settings/categories/[id]/toggle:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Access denied.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to toggle category status',
      },
      { status: 500 }
    );
  }
}

