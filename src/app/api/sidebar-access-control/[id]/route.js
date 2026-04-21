/**
 * Sidebar Access Control by ID API Route
 * 
 * GET /api/sidebar-access-control/[id] - Get specific sidebar access control setting
 * PUT /api/sidebar-access-control/[id] - Update sidebar access control setting
 * DELETE /api/sidebar-access-control/[id] - Delete sidebar access control setting
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import {
  getSidebarAccessControlById,
  updateSidebarAccessControlById,
  upsertSidebarAccessControl,
  deleteSidebarAccessControl,
} from '@/lib/db/sidebar-access-control.js';

/**
 * GET /api/sidebar-access-control/[id]
 * Get specific sidebar access control setting
 */
export async function GET(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID parameter is required',
        },
        { status: 400 }
      );
    }

    // Get access control setting by ID
    const setting = await getSidebarAccessControlById(id);

    if (!setting) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sidebar access control setting not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: setting,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sidebar-access-control/[id]:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sidebar access control setting',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sidebar-access-control/[id]
 * Update sidebar access control setting
 */
export async function PUT(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID parameter is required',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { isEnabled } = body;

    // Get existing setting to verify it exists
    const existing = await getSidebarAccessControlById(id);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sidebar access control setting not found',
        },
        { status: 404 }
      );
    }

    // Update setting (only isEnabled can be updated via PUT)
    // For full updates including scope changes, use upsertSidebarAccessControl
    if (isEnabled === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'isEnabled is required',
        },
        { status: 400 }
      );
    }

    const setting = await updateSidebarAccessControlById(id, { isEnabled });

    return NextResponse.json(
      {
        success: true,
        data: setting,
        message: 'Sidebar access control setting updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sidebar-access-control/[id]:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    // Handle validation errors
    if (error.message && error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update sidebar access control setting',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sidebar-access-control/[id]
 * Delete sidebar access control setting
 */
export async function DELETE(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID parameter is required',
        },
        { status: 400 }
      );
    }

    // Delete access control setting
    const deleted = await deleteSidebarAccessControl(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sidebar access control setting not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Sidebar access control setting deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sidebar-access-control/[id]:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete sidebar access control setting',
      },
      { status: 500 }
    );
  }
}
