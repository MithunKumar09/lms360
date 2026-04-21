/**
 * Course Subcategory by ID API Route
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
} from '@/lib/db/course-settings/subcategories.js';

export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.subcategories, 'read');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subcategory ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const subcategory = await getSubcategoryById(id, orgId);

    if (!subcategory) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subcategory }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/course-settings/subcategories/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get subcategory' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.subcategories, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subcategory ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, status } = body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Subcategory name cannot be empty', errors: { name: 'Subcategory name is required' } },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
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
    const subcategory = await updateSubcategory(id, updateData, orgId);

    if (!subcategory) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: subcategory, message: 'Subcategory updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/subcategories/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update subcategory' },
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
      await requireFeatureAccess(userRole, FEATURE_NAMES.subcategories, 'write');
    }

    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subcategory ID format' },
        { status: 400 }
      );
    }

    const orgId = userRole === 'admin' ? session.user.orgId : null;
    const deleted = await deleteSubcategory(id, orgId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Subcategory deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/course-settings/subcategories/[id]:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unauthorized. Access denied.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}

