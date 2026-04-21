/**
 * Organization Header Logo API Route
 * 
 * Returns the header logo URL for the authenticated user's organization
 * GET /api/organizations/header-logo
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getBrandAssetByKey } from '@/lib/db/organizationBrandAssets.js';

/**
 * GET /api/organizations/header-logo
 * 
 * Returns the header logo URL for the user's organization
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

    // Fetch header logo for the organization
    const headerLogo = await getBrandAssetByKey(orgId, 'header_logo', 'default');

    return NextResponse.json(
      {
        success: true,
        logoUrl: headerLogo?.url || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [HEADER LOGO API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch header logo',
        logoUrl: null,
      },
      { status: 500 }
    );
  }
}

