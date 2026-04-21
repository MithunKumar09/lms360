/**
 * Course Type by ID API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  getCourseTypeById,
  updateCourseType,
  deleteCourseType,
} from '@/lib/db/course-settings/types.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.types, 'read');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course type ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const courseType = await getCourseTypeById(id, orgId);

    if (!courseType) {
      return NextResponse.json(
        { success: false, error: 'Course type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: courseType }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/course-settings/types/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get course type' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.types, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course type ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, status } = body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Course type name cannot be empty', errors: { name: 'Course type name is required' } },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Course type name must be 100 characters or less', errors: { name: 'Course type name is too long' } },
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
    const courseType = await updateCourseType(id, updateData, orgId);

    if (!courseType) {
      return NextResponse.json(
        { success: false, error: 'Course type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: courseType, message: 'Course type updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/types/[id]:', error);
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
      { success: false, error: error.message || 'Failed to update course type' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.types, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course type ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const deleted = await deleteCourseType(id, orgId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Course type not found or cannot be deleted (system default)' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Course type deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/course-settings/types/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    if (error.message?.includes('system default')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete course type' },
      { status: 500 }
    );
  }
}

