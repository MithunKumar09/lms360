/**
 * Organization Loading Mark API Route
 * 
 * Returns the loading mark URL for the authenticated user's organization
 * GET /api/organizations/loading-mark
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getBrandAssetByKey } from '@/lib/db/organizationBrandAssets.js';

/**
 * GET /api/organizations/loading-mark
 * 
 * Returns the loading mark URL for the user's organization
 */
export async function GET(request) {
  try {
    // Get session
    const session = await auth();

    if (!session || !session.user) {
      // No session - return null to use default logo
      return NextResponse.json(
        {
          success: true,
          logoUrl: null,
        },
        { status: 200 }
      );
    }

    const orgId = session.user.orgId;

    // If no orgId (superadmin), return null to use default logo
    if (!orgId) {
      return NextResponse.json(
        {
          success: true,
          logoUrl: null,
        },
        { status: 200 }
      );
    }

    // Fetch loading mark for the organization
    const loadingMark = await getBrandAssetByKey(orgId, 'loading_mark', 'default');

    return NextResponse.json(
      {
        success: true,
        logoUrl: loadingMark?.url || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [LOADING MARK API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch loading mark',
        logoUrl: null,
      },
      { status: 500 }
    );
  }
}

