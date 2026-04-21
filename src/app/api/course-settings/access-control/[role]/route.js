/**
 * Access Control Settings by Role API Route
 * 
 * GET /api/course-settings/access-control/[role]
 * Get access control settings for specific role
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getAccessControlSettings } from '@/lib/db/course-settings/accessControl.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    const { role } = params;

    // Validate role
    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role parameter',
        },
        { status: 400 }
      );
    }

    // Get access control settings
    const settings = await getAccessControlSettings(role);

    // Format as object with feature_name as key
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.feature_name] = {
        read_access: setting.read_access === 1,
        write_access: setting.write_access === 1,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: settingsMap,
        settings: settings, // Also return array format
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/course-settings/access-control/[role]:', error);

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
        error: error.message || 'Failed to fetch access control settings',
      },
      { status: 500 }
    );
  }
}

