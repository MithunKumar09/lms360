/**
 * Program Types API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  createProgramType,
  listProgramTypes,
} from '@/lib/db/course-settings/programTypes.js';

export async function GET(request) {
  try {
    // Allow superadmin, admin, vendor, student, and alumni to read program types
    // Students and alumni need this for filtering courses by program type
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor', 'student', 'alumni']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Only check feature access for admin (vendors, students, and alumni can read program types)
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.program_types, 'read');
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      // For admin, use their orgId (shows global + org-specific)
      // For vendor, don't set org_id (shows all program types: global + all admin-created)
      // For student/alumni, use their orgId (shows global + org-specific, similar to courses)
      // For superadmin, use query param or null (shows global or all based on query)
      org_id: userRole === 'admin' || userRole === 'student' || userRole === 'alumni'
        ? session.user.orgId 
        : (userRole === 'vendor' 
          ? undefined  // Vendors see all program types (global + all admin-created)
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

    const result = await listProgramTypes(filters);

    return NextResponse.json(
      {
        success: true,
        data: result.programTypes,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in GET /api/course-settings/program-types:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch program types' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.program_types, 'write');
    }

    const body = await request.json();
    const { name, icon, color, status } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program type name is required',
          errors: { name: 'Program type name is required' },
        },
        { status: 400 }
      );
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid color format. Use hex format (e.g., #5f2ded)',
          errors: { color: 'Invalid color format' },
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

    const programType = await createProgramType({
      org_id: finalOrgId,
      name: name.trim(),
      icon: icon?.trim() || null,
      color: color || null,
      status: status !== undefined ? status : 1,
      created_by: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: programType,
        message: 'Program type created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in POST /api/course-settings/program-types:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create program type' },
      { status: 500 }
    );
  }
}

