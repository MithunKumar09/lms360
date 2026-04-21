/**
 * Superadmin Brand Details API Route
 * 
 * GET /api/superadmin/brands/[id] - Get brand profile by ID
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getBrandProfileById } from '@/lib/db/brand/superadmin.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand profile ID is required',
        },
        { status: 400 }
      );
    }

    const { id: profileId } = params;

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid brand profile ID format',
        },
        { status: 400 }
      );
    }

    // Fetch brand profile
    const brand = await getBrandProfileById(profileId);

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand profile not found',
        },
        { status: 404 }
      );
    }

    // Conditional GET with ETag based on updated_at
    const updatedAt = brand.updated_at || brand.updatedAt || null;
    const weakEtag = updatedAt ? `W/"brand-${brand.id}-${new Date(updatedAt).getTime()}"` : `W/"brand-${brand.id}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && weakEtag && ifNoneMatch === weakEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': weakEtag,
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'Vary': 'Authorization, Cookie',
        },
      });
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [BRANDS] Retrieved brand profile:', {
        id: brand.id,
        brand_name: brand.brand_name,
      });
    }

    return NextResponse.json(
      {
        success: true,
        brand,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'ETag': weakEtag,
          'Vary': 'Authorization, Cookie',
        },
      }
    );
  } catch (error) {
    console.error('Error getting brand profile:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get brand profile',
      },
      { status: error.status || 500 }
    );
  }
}