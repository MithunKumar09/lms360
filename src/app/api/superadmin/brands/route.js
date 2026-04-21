/**
 * Superadmin Brand Management API Route
 * 
 * GET /api/superadmin/brands - List all brand profiles
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getAllBrandProfiles } from '@/lib/db/brand/superadmin.js';

export async function GET(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') || null;

    // Validate pagination
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get brands
    const data = await getAllBrandProfiles({
      status,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch brands',
      },
      { status: error.status || 500 }
    );
  }
}
