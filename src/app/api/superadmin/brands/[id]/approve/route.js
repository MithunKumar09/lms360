/**
 * Superadmin Brand Approval API Route
 * 
 * PATCH /api/superadmin/brands/[id]/approve - Approve brand profile
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { approveBrandProfile } from '@/lib/db/brand/profile.js';

export async function PATCH(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

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

    // Approve brand profile
    const profile = await approveBrandProfile(profileId, userId);

    return NextResponse.json({
      success: true,
      data: {
        profile,
      },
    });
  } catch (error) {
    console.error('Error approving brand:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to approve brand',
      },
      { status: error.status || 500 }
    );
  }
}
