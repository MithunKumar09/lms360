/**
 * Course Categories API Route
 * 
 * Handles GET (list) and POST (create) operations for course categories.
 * Superadmin: Can create global (org_id = NULL) or org-specific
 * Admin: Can create org-specific only, requires write access
 * 
 * GET /api/course-settings/categories
 * - Query params: ?org_id=&status=1&search=&page=1&limit=20
 * - Returns: { success: true, categories: [], pagination: {} }
 * 
 * POST /api/course-settings/categories
 * - Request body: { name, description, thumbnail_url, org_id?, status? }
 * - Returns: { success: true, data: {...} }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  createCategory,
  listCategories,
} from '@/lib/db/course-settings/categories.js';

/**
 * GET /api/course-settings/categories
 * List categories with filters, pagination, and search
 */
export async function GET(request) {
  try {
    // Authentication: superadmin, admin, or vendor (vendors need this for course creation)
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Only check feature access for admin (vendors can read categories for course creation)
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.categories, 'read');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      // For admin, use their orgId (shows global + org-specific)
      // For vendor, don't set org_id (shows all categories: global + all org-specific)
      // For superadmin, use query param or null (shows global or all based on query)
      org_id: userRole === 'admin' 
        ? session.user.orgId 
        : (userRole === 'vendor' 
          ? undefined  // Vendors see all categories (global + all admin-created)
          : (searchParams.get('org_id') || null)),
      status: searchParams.get('status') ? parseInt(searchParams.get('status'), 10) : undefined,
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    // Fetch categories
    const result = await listCategories(filters);

    return NextResponse.json(
      {
        success: true,
        data: result.categories,
        pagination: result.pagination,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in GET /api/course-settings/categories:', error);
    }

    // Handle authentication/authorization errors
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
        error: error.message || 'Failed to fetch categories',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/course-settings/categories
 * Create a new category
 */
export async function POST(request) {
  try {
    // Authentication: superadmin or admin
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Check write access for admin
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.categories, 'write');
    }

    // Parse request body
    const body = await request.json();
    const { name, description, thumbnail_url, org_id, status } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category name is required',
          errors: { name: 'Category name is required' },
        },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category name must be 255 characters or less',
          errors: { name: 'Category name is too long' },
        },
        { status: 400 }
      );
    }

    // Determine org_id
    let finalOrgId = null;
    if (userRole === 'superadmin') {
      // Superadmin can set org_id (NULL for global, or specific org_id)
      finalOrgId = org_id || null;
    } else if (userRole === 'admin') {
      // Admin can only create org-specific (must use their org_id)
      finalOrgId = session.user.orgId;
    }

    // Create category
    const category = await createCategory({
      name: name.trim(),
      description: description?.trim() || null,
      thumbnail_url: thumbnail_url || null,
      org_id: finalOrgId,
      status: status !== undefined ? status : 1,
      created_by: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in POST /api/course-settings/categories:', error);
    }

    // Handle authentication/authorization errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Access denied.',
        },
        { status: error.status }
      );
    }

    // Handle validation errors
    if (error.code === '23514') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category data',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create category',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

