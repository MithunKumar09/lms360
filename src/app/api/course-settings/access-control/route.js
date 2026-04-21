/**
 * Access Control Settings API Route
 * 
 * Superadmin only - Controls admin read/write permissions for course settings features
 * 
 * GET /api/course-settings/access-control
 * PUT /api/course-settings/access-control
 */

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import {
  getAccessControlSettings,
  updateAccessControlSettings,
} from '@/lib/db/course-settings/accessControl.js';

/**
 * GET /api/course-settings/access-control
 * Get all access control settings
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'admin';

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
    console.error('Error in GET /api/course-settings/access-control:', error);

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

/**
 * PUT /api/course-settings/access-control
 * Update access control settings
 * 
 * Request body:
 * {
 *   role: 'admin',
 *   settings: {
 *     categories: { read_access: true, write_access: false },
 *     subcategories: { read_access: true, write_access: true },
 *     // ... etc
 *   }
 * }
 */
export async function PUT(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    const body = await request.json();
    const { role = 'admin', settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings object is required',
          errors: { settings: 'Settings object is required' },
        },
        { status: 400 }
      );
    }

    // Convert boolean to 0/1 for database
    const settingsToUpdate = {};
    Object.keys(settings).forEach((featureName) => {
      const { read_access = false, write_access = false } = settings[featureName];
      settingsToUpdate[featureName] = {
        read_access: read_access === true ? 1 : 0,
        write_access: write_access === true ? 1 : 0,
      };
    });

    // Update access control settings
    const updatedSettings = await updateAccessControlSettings(
      settingsToUpdate,
      role,
      session.user.id
    );

    // Revalidate all course settings cache tags to ensure admin users see updated data
    // This triggers cache invalidation for all course settings endpoints
    revalidateTag('course-settings');
    revalidateTag('course-settings-categories');
    revalidateTag('course-settings-subcategories');
    revalidateTag('course-settings-types');
    revalidateTag('course-settings-program-types');
    revalidateTag('course-settings-levels');
    revalidateTag('course-settings-skills');
    revalidateTag('course-settings-testimonials');
    revalidateTag('course-settings-access-control');

    // Format response
    const settingsMap = {};
    updatedSettings.forEach((setting) => {
      settingsMap[setting.feature_name] = {
        read_access: setting.read_access === 1,
        write_access: setting.write_access === 1,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: settingsMap,
        message: 'Access control settings updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/course-settings/access-control:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    if (error.code === '23514') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid access control data',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update access control settings',
      },
      { status: 500 }
    );
  }
}

