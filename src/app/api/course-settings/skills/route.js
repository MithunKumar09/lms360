/**
 * Course Skills API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  createCourseSkill,
  listCourseSkills,
} from '@/lib/db/course-settings/skills.js';

export async function GET(request) {
  try {
    // Allow superadmin, admin, and vendor to read course skills (vendors need this for course creation)
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Only check feature access for admin (vendors can read skills for course creation)
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.skills, 'read');
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      // For admin, use their orgId (shows global + org-specific)
      // For vendor, don't set org_id (shows all course skills: global + all admin-created)
      // For superadmin, use query param or null (shows global or all based on query)
      org_id: userRole === 'admin' 
        ? session.user.orgId 
        : (userRole === 'vendor' 
          ? undefined  // Vendors see all course skills (global + all admin-created)
          : (searchParams.get('org_id') || null)),
      category_id: searchParams.get('category_id') || undefined,
      subcategory_id: searchParams.get('subcategory_id') || undefined,
      status: searchParams.get('status') ? parseInt(searchParams.get('status'), 10) : undefined,
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    const result = await listCourseSkills(filters);

    return NextResponse.json(
      {
        success: true,
        data: result.courseSkills,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in GET /api/course-settings/skills:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch course skills' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.skills, 'write');
    }

    const body = await request.json();
    const { name, category_id, subcategory_id, status } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course skill name is required',
          errors: { name: 'Course skill name is required' },
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

    const courseSkill = await createCourseSkill({
      org_id: finalOrgId,
      name: name.trim(),
      category_id: category_id || null,
      subcategory_id: subcategory_id || null,
      status: status !== undefined ? status : 1,
      created_by: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: courseSkill,
        message: 'Course skill created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Don't log access denied errors (expected when superadmin restricts access)
    const isAccessDenied = error.status === 403 || error.code === 'ACCESS_DENIED';
    if (!isAccessDenied) {
      console.error('Error in POST /api/course-settings/skills:', error);
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create course skill' },
      { status: 500 }
    );
  }
}

