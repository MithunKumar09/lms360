/**
 * Sidebar Access Control Check API Route
 * 
 * GET /api/sidebar-access-control/check?sidebarName=admin
 * Check current user's access to a specific sidebar
 * 
 * This route allows any authenticated user to check their own sidebar access.
 * It resolves priority: user > organization > role > global
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards.js';
import { checkSidebarAccess } from '@/lib/db/sidebar-access-control.js';

/**
 * GET /api/sidebar-access-control/check
 * Check current user's access to a sidebar
 */
export async function GET(request) {
  try {
    // Authentication: Any authenticated user can check their own access
    const session = await requireAuth(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = session.user.orgId || null;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sidebarName = searchParams.get('sidebarName');

    // Validate sidebar name
    if (!sidebarName) {
      return NextResponse.json(
        {
          success: false,
          error: 'sidebarName query parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate sidebar name format
    const validSidebarNames = ['superadmin', 'admin', 'instructor', 'vendor', 'mentor', 'student'];
    if (!validSidebarNames.includes(sidebarName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid sidebarName: ${sidebarName}. Must be one of: ${validSidebarNames.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check sidebar access (this already uses getEffectiveSidebarAccess internally)
    const hasAccess = await checkSidebarAccess(userId, userRole, orgId, sidebarName);

    return NextResponse.json(
      {
        success: true,
        data: {
          is_enabled: hasAccess,
          sidebar_name: sidebarName,
          user_id: userId,
          user_role: userRole,
          org_id: orgId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sidebar-access-control/check:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Authentication required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check sidebar access',
      },
      { status: 500 }
    );
  }
}
