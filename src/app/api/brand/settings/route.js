/**
 * Brand Settings API Route
 * 
 * GET /api/brand/settings - Get brand settings
 * PUT /api/brand/settings - Update brand settings
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandSettings, updateBrandSettings } from '@/lib/db/brand/settings.js';

export async function GET(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Get settings
    const settings = await getBrandSettings(userId);

    return NextResponse.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error('Error fetching brand settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch settings',
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'settings object is required',
        },
        { status: 400 }
      );
    }

    // Update settings
    const updatedSettings = await updateBrandSettings(userId, settings);

    return NextResponse.json({
      success: true,
      data: {
        settings: updatedSettings,
      },
    });
  } catch (error) {
    console.error('Error updating brand settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update settings',
      },
      { status: error.status || 500 }
    );
  }
}
