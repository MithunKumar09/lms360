/**
 * Sidebar Access Control Bulk Operations API Route
 * 
 * POST /api/sidebar-access-control/bulk
 * Bulk update multiple sidebar access control settings
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { bulkUpdateSidebarAccessControls } from '@/lib/db/sidebar-access-control.js';

/**
 * POST /api/sidebar-access-control/bulk
 * Bulk update sidebar access control settings
 */
export async function POST(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { settings } = body;

    // Validate settings array
    if (!Array.isArray(settings)) {
      return NextResponse.json(
        {
          success: false,
          error: 'settings must be an array',
        },
        { status: 400 }
      );
    }

    if (settings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'settings array cannot be empty',
        },
        { status: 400 }
      );
    }

    // Validate each setting
    const validScopeTypes = ['global', 'role', 'organization', 'user'];
    const validSidebarNames = ['superadmin', 'admin', 'instructor', 'vendor', 'mentor', 'student'];

    for (let i = 0; i < settings.length; i++) {
      const setting = settings[i];

      if (!setting.scopeType) {
        return NextResponse.json(
          {
            success: false,
            error: `settings[${i}].scopeType is required`,
          },
          { status: 400 }
        );
      }

      if (!validScopeTypes.includes(setting.scopeType)) {
        return NextResponse.json(
          {
            success: false,
            error: `settings[${i}].scopeType must be one of: ${validScopeTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }

      if (!setting.sidebarName) {
        return NextResponse.json(
          {
            success: false,
            error: `settings[${i}].sidebarName is required`,
          },
          { status: 400 }
        );
      }

      if (!validSidebarNames.includes(setting.sidebarName)) {
        return NextResponse.json(
          {
            success: false,
            error: `settings[${i}].sidebarName must be one of: ${validSidebarNames.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Validate scope value
      if (setting.scopeType === 'global' && setting.scopeValue !== null && setting.scopeValue !== undefined) {
        return NextResponse.json(
          {
            success: false,
            error: `settings[${i}].scopeValue must be null for global scopeType`,
          },
          { status: 400 }
        );
      }

      if (setting.scopeType !== 'global' && !setting.scopeValue) {
        return NextResponse.json(
          {
            success: false,
            error: `settings[${i}].scopeValue is required for scopeType: ${setting.scopeType}`,
          },
          { status: 400 }
        );
      }
    }

    // Bulk update settings
    const updatedSettings = await bulkUpdateSidebarAccessControls(settings, userId);

    return NextResponse.json(
      {
        success: true,
        data: updatedSettings,
        count: updatedSettings.length,
        message: `Successfully updated ${updatedSettings.length} sidebar access control setting(s)`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/sidebar-access-control/bulk:', error);

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
        error: error.message || 'Failed to bulk update sidebar access control settings',
      },
      { status: 500 }
    );
  }
}
