/**
 * Sidebar Access Control API Route
 * 
 * GET /api/sidebar-access-control - List all sidebar access control settings (superadmin only)
 * POST /api/sidebar-access-control - Create new sidebar access control setting (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import {
  getAllSidebarAccessControls,
  upsertSidebarAccessControl,
} from '@/lib/db/sidebar-access-control.js';

/**
 * GET /api/sidebar-access-control
 * List all sidebar access control settings with optional filters
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const scopeType = searchParams.get('scopeType');
    const scopeValue = searchParams.get('scopeValue');
    const sidebarName = searchParams.get('sidebarName');
    const isEnabled = searchParams.get('isEnabled');
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build filters
    const filters = {};
    if (scopeType) filters.scopeType = scopeType;
    if (scopeValue !== null && scopeValue !== undefined) {
      filters.scopeValue = scopeValue === '' ? null : scopeValue;
    }
    if (sidebarName) filters.sidebarName = sidebarName;
    if (isEnabled !== null && isEnabled !== undefined) {
      filters.isEnabled = isEnabled === 'true';
    }
    filters.limit = limit;
    filters.offset = offset;

    // Get all access control settings
    const settings = await getAllSidebarAccessControls(filters);

    return NextResponse.json(
      {
        success: true,
        data: settings,
        count: settings.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sidebar-access-control:', error);

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
        error: error.message || 'Failed to fetch sidebar access control settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sidebar-access-control
 * Create new sidebar access control setting
 */
export async function POST(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { scopeType, scopeValue, sidebarName, isEnabled } = body;

    // Validate required fields
    if (!scopeType) {
      return NextResponse.json(
        {
          success: false,
          error: 'scopeType is required',
        },
        { status: 400 }
      );
    }

    if (!sidebarName) {
      return NextResponse.json(
        {
          success: false,
          error: 'sidebarName is required',
        },
        { status: 400 }
      );
    }

    // Validate scope value based on scope type
    if (scopeType === 'global' && scopeValue !== null && scopeValue !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'scopeValue must be null for global scopeType',
        },
        { status: 400 }
      );
    }

    if (scopeType !== 'global' && !scopeValue) {
      return NextResponse.json(
        {
          success: false,
          error: `scopeValue is required for scopeType: ${scopeType}`,
        },
        { status: 400 }
      );
    }

    // Create or update access control setting
    const setting = await upsertSidebarAccessControl({
      scopeType,
      scopeValue: scopeType === 'global' ? null : scopeValue,
      sidebarName,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: setting,
        message: 'Sidebar access control setting created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sidebar-access-control:', error);

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
        error: error.message || 'Failed to create sidebar access control setting',
      },
      { status: 500 }
    );
  }
}
