/**
 * Course Level by ID API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  getCourseLevelById,
  updateCourseLevel,
  deleteCourseLevel,
} from '@/lib/db/course-settings/levels.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.levels, 'read');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course level ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const courseLevel = await getCourseLevelById(id, orgId);

    if (!courseLevel) {
      return NextResponse.json(
        { success: false, error: 'Course level not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: courseLevel }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/course-settings/levels/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get course level' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.levels, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course level ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, status } = body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Course level name cannot be empty', errors: { name: 'Course level name is required' } },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Course level name must be 100 characters or less', errors: { name: 'Course level name is too long' } },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
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
    const courseLevel = await updateCourseLevel(id, updateData, orgId);

    if (!courseLevel) {
      return NextResponse.json(
        { success: false, error: 'Course level not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: courseLevel, message: 'Course level updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/levels/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update course level' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.levels, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course level ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const deleted = await deleteCourseLevel(id, orgId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Course level not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Course level deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/course-settings/levels/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete course level' },
      { status: 500 }
    );
  }
}

