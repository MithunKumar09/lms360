/**
 * Course Types API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  createCourseType,
  listCourseTypes,
} from '@/lib/db/course-settings/types.js';

export async function GET(request) {
  try {
    // Allow superadmin, admin, instructor, and vendor to read course types (vendors need this for course creation)
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'vendor']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Only check feature access for admin (instructors and vendors can read types for filtering/course creation)
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.types, 'read');
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      // For admin and instructor, use their orgId (shows global + org-specific)
      // For vendor, don't set org_id (shows all course types: global + all admin-created)
      // For superadmin, use query param or null (shows global or all based on query)
      org_id: (userRole === 'admin' || userRole === 'instructor') 
        ? session.user.orgId 
        : (userRole === 'vendor' 
          ? undefined  // Vendors see all course types (global + all admin-created)
          : (searchParams.get('org_id') || null)),
      status: searchParams.get('status') ? parseInt(searchParams.get('status'), 10) : undefined,
      fixed: searchParams.get('fixed') ? parseInt(searchParams.get('fixed'), 10) : undefined,
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    const result = await listCourseTypes(filters);

    return NextResponse.json(
      {
        success: true,
        data: result.courseTypes,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in GET /api/course-settings/types:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch course types' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.types, 'write');
    }

    const body = await request.json();
    const { name, status } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course type name is required',
          errors: { name: 'Course type name is required' },
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course type name must be 100 characters or less',
          errors: { name: 'Course type name is too long' },
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

    const courseType = await createCourseType({
      org_id: finalOrgId,
      name: name.trim(),
      fixed: 0, // User-created types are not fixed
      status: status !== undefined ? status : 1,
      created_by: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: courseType,
        message: 'Course type created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in POST /api/course-settings/types:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errors: { name: 'Course type with this name already exists' },
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create course type' },
      { status: 500 }
    );
  }
}

