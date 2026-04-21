/**
 * Course Category by ID API Route
 * 
 * Handles GET (by ID), PUT (update), and DELETE operations for a specific category.
 * 
 * GET /api/course-settings/categories/[id]
 * PUT /api/course-settings/categories/[id]
 * DELETE /api/course-settings/categories/[id]
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { requireFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/lib/db/course-settings/categories.js';

/**
 * GET /api/course-settings/categories/[id]
 * Get category by ID
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Check read access for admin
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.categories, 'read');
    }

    const { id } = params;

    // Validate UUID format
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

    // Fetch category
    const category = await getCategoryById(id, orgId);

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
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/course-settings/categories/[id]:', error);

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
        error: error.message || 'Failed to get category',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/course-settings/categories/[id]
 * Update category
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Check write access for admin
    if (userRole === 'admin') {
      await requireFeatureAccess(userRole, FEATURE_NAMES.categories, 'write');
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, thumbnail_url, status } = body;

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

    // Build update data
    const updateData = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Category name cannot be empty',
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
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (thumbnail_url !== undefined) {
      updateData.thumbnail_url = thumbnail_url || null;
    }

    if (status !== undefined) {
      if (status !== 0 && status !== 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Status must be 0 (inactive) or 1 (active)',
            errors: { status: 'Invalid status value' },
          },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update',
        },
        { status: 400 }
      );
    }

    // Get org_id filter for admin
    const orgId = userRole === 'admin' ? session.user.orgId : null;

    // Update category
    const category = await updateCategory(id, updateData, orgId);

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
        message: 'Category updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/categories/[id]:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Access denied.',
        },
        { status: error.status }
      );
    }

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
        error: error.message || 'Failed to update category',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/course-settings/categories/[id]
 * Delete category
 */
export async function DELETE(request, { params }) {
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

    // Delete category
    const deleted = await deleteCategory(id, orgId);

    if (!deleted) {
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
        message: 'Category deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/course-settings/categories/[id]:', error);

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
        error: error.message || 'Failed to delete category',
      },
      { status: 500 }
    );
  }
}

