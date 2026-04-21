/**
 * Course Subcategories API Route
 * 
 * GET /api/course-settings/subcategories
 * POST /api/course-settings/subcategories
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  createSubcategory,
  listSubcategories,
} from '@/lib/db/course-settings/subcategories.js';

export async function GET(request) {
  try {
    // Allow superadmin, admin, and vendor to read subcategories (vendors need this for course creation)
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Only check feature access for admin (vendors can read subcategories for course creation)
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.subcategories, 'read');
    }

    const { searchParams } = new URL(request.url);
    // Accept both categoryId (camelCase) and category_id (snake_case) for compatibility
    const categoryId = searchParams.get('categoryId') || searchParams.get('category_id') || undefined;
    
    // Validate: category_id is required for subcategories
    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID is required to fetch subcategories',
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        },
        { status: 400 }
      );
    }
    
    const filters = {
      category_id: categoryId, // Required: subcategories must be filtered by category
      // For admin, use their orgId (shows global + org-specific)
      // For vendor, don't set org_id (shows all subcategories for the selected category: global + all admin-created)
      // For superadmin, use query param or null (shows global or all based on query)
      org_id: userRole === 'admin' 
        ? session.user.orgId 
        : (userRole === 'vendor' 
          ? undefined  // Vendors see all subcategories for the selected category (global + all admin-created)
          : (searchParams.get('org_id') || null)),
      status: searchParams.get('status') ? parseInt(searchParams.get('status'), 10) : undefined,
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    const result = await listSubcategories(filters);

    return NextResponse.json(
      {
        success: true,
        data: result.subcategories,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in GET /api/course-settings/subcategories:', error);
    }

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
        error: error.message || 'Failed to fetch subcategories',
      },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.subcategories, 'write');
    }

    const body = await request.json();
    const { category_id, name, description, status } = body;

    if (!category_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID is required',
          errors: { category_id: 'Category ID is required' },
        },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subcategory name is required',
          errors: { name: 'Subcategory name is required' },
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

    const subcategory = await createSubcategory({
      category_id,
      org_id: finalOrgId,
      name: name.trim(),
      description: description?.trim() || null,
      status: status !== undefined ? status : 1,
      created_by: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: subcategory,
        message: 'Subcategory created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in POST /api/course-settings/subcategories:', error);
    }

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
        error: error.message || 'Failed to create subcategory',
      },
      { status: 500 }
    );
  }
}

